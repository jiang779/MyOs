import { describe, expect, it } from 'vitest'
import { parseSSE } from '../sse'

const encoder = new TextEncoder()
const encode = (text: string) => encoder.encode(text)

describe('parseSSE / ChatStreamParser', () => {
  it('跨 chunk 的多字节字符不会乱码', () => {
    const text = 'data: {"type":"MESSAGE","delta":"你好"}\n\n'
    const bytes = encode(text)
    // 从第一个非 ASCII 字节之后切开，故意切在汉字中间
    const split = bytes.findIndex((b) => b > 127) + 1

    const parser = new parseSSE()
    expect(parser.push(bytes.slice(0, split))).toEqual([])
    expect(parser.push(bytes.slice(split))).toEqual([{ type: 'MESSAGE', delta: '你好' }])
  })

  it('\\r\\n 被切在两个 chunk 之间也能识别事件边界', () => {
    const parser = new parseSSE()
    expect(parser.push(encode('data: {"type":"MESSAGE","delta":"a"}\r'))).toEqual([])
    expect(parser.push(encode('\n\r\n'))).toEqual([{ type: 'MESSAGE', delta: 'a' }])
  })

  it('多行 data: 按 SSE 规则拼接后再 JSON.parse', () => {
    const parser = new parseSSE()
    const frames = parser.push(encode('data: {"type":"MESSAGE",\ndata: "delta":"b"}\n\n'))
    expect(frames).toEqual([{ type: 'MESSAGE', delta: 'b' }])
  })

  it('没有 \\n\\n 的尾段留在 buffer，等下一片再解析', () => {
    const parser = new parseSSE()
    expect(parser.push(encode('data: {"type":"MESSAGE","delta":"x"}'))).toEqual([])
    expect(parser.push(encode('\n\n'))).toEqual([{ type: 'MESSAGE', delta: 'x' }])
  })

  it('JSON.parse 失败的事件不丢弃，后续事件照常处理，flush 时报错', () => {
    const parser = new parseSSE()
    const frames = parser.push(
      encode('data: {oops}\n\ndata: {"type":"MESSAGE","delta":"ok"}\n\n')
    )
    expect(frames).toEqual([{ type: 'MESSAGE', delta: 'ok' }])

    const tail = parser.flush()
    expect(tail).toHaveLength(1)
    expect(tail[0].type).toBe('ERROR')
  })

  it('识别 [DONE] 与工具帧', () => {
    const parser = new parseSSE()
    const frames = parser.push(
      encode(
        'data: {"type":"TOOL_CALL","id":"c1","name":"lookup","arguments":"{\\"q\\":1}"}\n\n' +
          'data: {"type":"TOOL_RESULT","id":"c1","content":"ok"}\n\n' +
          'data: [DONE]\n\n'
      )
    )
    expect(frames).toEqual([
      { type: 'TOOL_CALL', id: 'c1', name: 'lookup', arguments: '{"q":1}', status: undefined },
      { type: 'TOOL_RESULT', id: 'c1', content: 'ok' },
      { type: 'DONE' },
    ])
  })

  it('支持 SSE event 名、INIT_REQUEST_ID、THINKING 与工具耗时', () => {
    const parser = new parseSSE()
    const frames = parser.push(
      encode(
        'event: INIT_REQUEST_ID\ndata: {"requestId":"r1"}\n\n' +
          'data: {"type":"THINKING","delta":"想","seq":1}\n\n' +
          'data: {"type":"TOOL_RESULT","id":"c1","content":"超时","status":"error","durationMs":1500,"seq":2}\n\n'
      )
    )
    expect(frames).toEqual([
      { type: 'INIT_REQUEST_ID', requestId: 'r1' },
      { type: 'THINKING', delta: '想', seq: 1 },
      { type: 'TOOL_RESULT', id: 'c1', content: '超时', status: 'error', durationMs: 1500, seq: 2 },
    ])
  })

  it('解析 REFERENCE 引用帧', () => {
    const parser = new parseSSE()
    const frames = parser.push(
      encode(
        'data: {"type":"REFERENCE","references":[{"id":"c1","title":"说明.md","snippet":"摘要","content":"原文片段","score":0.82}]}\n\n'
      )
    )
    expect(frames).toEqual([
      {
        type: 'REFERENCE',
        references: [
          {
            id: 'c1',
            title: '说明.md',
            snippet: '摘要',
            content: '原文片段',
            score: 0.82,
            docId: undefined,
          },
        ],
      },
    ])
  })
})
