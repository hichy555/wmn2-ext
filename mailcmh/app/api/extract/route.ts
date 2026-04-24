import { NextRequest, NextResponse } from 'next/server'
import Imap from 'imap'
import { simpleParser, ParsedMail } from 'mailparser'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface EmailRecord {
  category: string
  ipAddress: string
  fullEmail: string
  subdomain: string
  fromEmail: string
  fromDomain: string
  fromName: string
  subject: string
  toAddress: string
  ccAddress: string
  spfStatus: string
  dkimStatus: string
  dkimParams: string
  dmarcStatus: string
  messageId: string
  returnPath: string
  sender: string
  replyTo: string
  inReplyTo: string
  contentType: string
  mimeVersion: string
  listId: string
  listUnsubscribe: string
  feedbackId: string
  date: string
}

function parseReceivedHeader(received: string | string[]): string {
  const receivedStr = Array.isArray(received) ? received[0] : (received || '')
  const ipMatch = receivedStr.match(/\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]/)
  if (ipMatch) return ipMatch[1]
  const fromMatch = receivedStr.match(/from\s+\S+\s+\(.*?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/)
  if (fromMatch) return fromMatch[1]
  return ''
}

function extractDomain(email: string): string {
  const match = email.match(/@(.+)$/)
  return match ? match[1] : ''
}

function extractSubdomain(email: string): string {
  const domain = extractDomain(email)
  const parts = domain.split('.')
  return parts.length > 2 ? parts[0] : ''
}

function parseAuthResults(authResults: string | string[]): {
  spf: string; dkim: string; dkimParams: string; dmarc: string
} {
  const str = Array.isArray(authResults)
    ? authResults.join(' ')
    : (authResults || '')

  const spfMatch = str.match(/spf=(\w+)/i)
  const dkimMatch = str.match(/dkim=(\w+)/i)
  const dmarcMatch = str.match(/dmarc=(\w+)/i)
  const dkimDomainMatch = str.match(/dkim=\w+[^;]*(?:header\.d=([^\s;]+))?/i)

  return {
    spf: spfMatch ? spfMatch[1] : 'none',
    dkim: dkimMatch ? dkimMatch[1] : 'none',
    dkimParams: dkimDomainMatch && dkimDomainMatch[1]
      ? `pass with domain: @${dkimDomainMatch[1]}`
      : (dkimMatch ? `${dkimMatch[1]}` : 'none'),
    dmarc: dmarcMatch ? dmarcMatch[1] : 'none',
  }
}

function detectGmailCategory(headers: Record<string, string | string[]>): string {
  const xGmailLabels = (headers['x-gmail-labels'] as string || '').toLowerCase()
  const listId = headers['list-id'] as string || ''
  const feedbackId = headers['x-feedback-id'] as string || ''
  const xGmailCategory = (headers['x-gm-message-state'] as string || '').toLowerCase()

  if (xGmailLabels.includes('spam')) return 'Spam'
  if (xGmailLabels.includes('category_social')) return 'Social'
  if (xGmailLabels.includes('category_promotions')) return 'Promotions'
  if (xGmailLabels.includes('category_updates')) return 'Updates'
  if (xGmailLabels.includes('category_forums')) return 'Forums'
  if (xGmailLabels.includes('inbox')) return 'Primary'

  if (feedbackId && feedbackId.includes('promotions')) return 'Promotions'
  if (listId) return 'Promotions'

  return 'Primary'
}

function parsedMailToRecord(parsed: ParsedMail): EmailRecord {
  const headers = parsed.headers as unknown as Record<string, string | string[]>
  const authResults = headers['authentication-results'] as string | string[] || ''
  const { spf, dkim, dkimParams, dmarc } = parseAuthResults(authResults)
  const received = headers['received'] as string | string[] || ''
  const ipAddress = parseReceivedHeader(received)

  const fromAddr = parsed.from?.value?.[0]?.address || ''
  const fromDomain = extractDomain(fromAddr)
  const subdomain = extractSubdomain(fromAddr)

  const toAddresses = parsed.to
    ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to])
        .flatMap(a => a.value)
        .map(v => v.address || '')
        .filter(Boolean)
        .join(', ')
    : ''

  const ccAddresses = parsed.cc
    ? (Array.isArray(parsed.cc) ? parsed.cc : [parsed.cc])
        .flatMap(a => a.value)
        .map(v => v.address || '')
        .filter(Boolean)
        .join(', ')
    : ''

  const replyTo = parsed.replyTo
    ? (Array.isArray(parsed.replyTo) ? parsed.replyTo : [parsed.replyTo])
        .flatMap(a => a.value)
        .map(v => v.address || '')
        .filter(Boolean)
        .join(', ')
    : ''

  const category = detectGmailCategory(headers)

  const contentType = parsed.headers.get('content-type')?.toString() || ''
  const mimeVersion = parsed.headers.get('mime-version')?.toString() || ''
  const listId = parsed.headers.get('list-id')?.toString() || ''
  const listUnsubscribe = parsed.headers.get('list-unsubscribe')?.toString() || ''
  const feedbackId = parsed.headers.get('x-feedback-id')?.toString() || ''
  const sender = parsed.headers.get('sender')?.toString() || ''
  const returnPath = parsed.headers.get('return-path')?.toString() || ''
  const inReplyTo = parsed.headers.get('in-reply-to')?.toString() || ''

  return {
    category,
    ipAddress,
    fullEmail: fromAddr,
    subdomain,
    fromEmail: fromAddr,
    fromDomain,
    fromName: parsed.from?.value?.[0]?.name || '',
    subject: parsed.subject || '',
    toAddress: toAddresses,
    ccAddress: ccAddresses,
    spfStatus: spf,
    dkimStatus: dkim,
    dkimParams,
    dmarcStatus: dmarc,
    messageId: parsed.messageId || '',
    returnPath,
    sender,
    replyTo,
    inReplyTo,
    contentType,
    mimeVersion,
    listId,
    listUnsubscribe,
    feedbackId,
    date: parsed.date?.toISOString() || '',
  }
}

async function fetchEmails(
  email: string,
  password: string,
  startFrom: number,
  count: number,
  categories: string[]
): Promise<EmailRecord[]> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: email,
      password,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 20000,
      authTimeout: 10000,
    })

    const records: EmailRecord[] = []

    imap.once('error', (err: Error) => {
      reject(new Error(`IMAP connection error: ${err.message}`))
    })

    imap.once('ready', () => {
      // Map category to Gmail folder
      const folderMap: Record<string, string[]> = {
        Primary: ['INBOX'],
        Social: ['[Gmail]/Social', 'INBOX'],
        Promotions: ['[Gmail]/Promotions', 'INBOX'],
        Updates: ['[Gmail]/Updates', 'INBOX'],
        Forums: ['[Gmail]/Forums', 'INBOX'],
        Spam: ['[Gmail]/Spam'],
      }

      // Collect messages from INBOX (Gmail categories are server-side labels)
      imap.openBox('INBOX', true, (err) => {
        if (err) {
          imap.end()
          reject(new Error(`Cannot open INBOX: ${err.message}`))
          return
        }

        imap.search(['ALL'], (err, allUids) => {
          if (err || !allUids.length) {
            imap.end()
            resolve([])
            return
          }

          // Reverse to get latest first
          const reversed = [...allUids].reverse()
          const start = Math.max(0, startFrom - 1)
          const sliced = reversed.slice(start, start + count * 3) // fetch more to filter

          if (!sliced.length) {
            imap.end()
            resolve([])
            return
          }

          const f = imap.fetch(sliced, { bodies: '' })
          const parsePromises: Promise<void>[] = []

          f.on('message', (msg) => {
            parsePromises.push(new Promise<void>((res) => {
              const chunks: Buffer[] = []
              msg.on('body', (stream) => {
                stream.on('data', (chunk: Buffer) => chunks.push(chunk))
                stream.on('end', () => {
                  const raw = Buffer.concat(chunks)
                  simpleParser(raw)
                    .then((parsed) => {
                      const record = parsedMailToRecord(parsed)
                      // Filter by selected categories
                      if (categories.length === 0 || categories.includes(record.category)) {
                        records.push(record)
                      }
                      res()
                    })
                    .catch(() => res())
                })
              })
            }))
          })

          f.once('error', (err: Error) => {
            imap.end()
            reject(new Error(`Fetch error: ${err.message}`))
          })

          f.once('end', async () => {
            await Promise.all(parsePromises)
            imap.end()
            // Return only requested count
            resolve(records.slice(0, count))
          })
        })
      })
    })

    imap.connect()
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, startFrom = 1, count = 10, categories = [], fields = [] } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const emails = await fetchEmails(email, password, startFrom, count, categories)

    return NextResponse.json({ emails, total: emails.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
