/**
 * inspect-pdf-fields.mjs — 检查 / 对比可填 PDF 的表单字段
 *
 * 用途:每当 IRS/EDD 发布新一年的税表时,不用再打开 Adobe。
 * 直接把官方可填 PDF 下下来,用这个脚本:
 *
 *   1) 列出一张 PDF 的所有可填字段(名字 + 类型 + 当前值 + 选项)：
 *        node scripts/inspect-pdf-fields.mjs public/forms/941/2026.pdf
 *
 *   2) 对比新旧两年,看字段名有没有变(IRS 字段名一般年年不变,
 *      diff 为空 = 直接把新 PDF 放进去、注册新年份即可,代码不用改)：
 *        node scripts/inspect-pdf-fields.mjs public/forms/941/2025.pdf public/forms/941/2026.pdf
 *
 * 只依赖仓库已装的 pdf-lib,无需额外安装。
 */

import fs from "node:fs"
import path from "node:path"
import { PDFDocument } from "pdf-lib"

/** 读取一张 PDF,返回 [{ name, type, value, options }] */
async function readFields(file) {
  const bytes = fs.readFileSync(file)
  const doc = await PDFDocument.load(bytes)
  const form = doc.getForm()

  return form.getFields().map((f) => {
    const type = f.constructor.name.replace(/^PDF/, "") // TextField / CheckBox / RadioGroup / Dropdown ...
    let value
    let options

    try {
      if (type === "TextField") value = f.getText() ?? ""
      else if (type === "CheckBox") value = f.isChecked() ? "checked" : ""
      else if (typeof f.getSelected === "function") value = f.getSelected()
    } catch {
      value = "<无法读取>"
    }
    if (typeof f.getOptions === "function") {
      try {
        options = f.getOptions()
      } catch {
        /* 无 options */
      }
    }

    return { name: f.getName(), type, value, options }
  })
}

/** 单文件模式:列出全部字段 */
function printList(file, fields) {
  console.log(`\n📄 ${file}`)
  console.log(`   可填字段总数: ${fields.length}\n`)
  for (const f of fields) {
    const opts = f.options?.length ? `  options=[${f.options.join(", ")}]` : ""
    const val = f.value ? `  value=${JSON.stringify(f.value)}` : ""
    console.log(`  [${f.type.padEnd(10)}] ${f.name}${val}${opts}`)
  }
}

/** 对比模式:两年字段名 diff */
function printDiff(fileA, a, fileB, b) {
  const namesA = new Map(a.map((f) => [f.name, f.type]))
  const namesB = new Map(b.map((f) => [f.name, f.type]))

  const removed = [...namesA.keys()].filter((n) => !namesB.has(n))
  const added = [...namesB.keys()].filter((n) => !namesA.has(n))
  const retyped = [...namesA.keys()].filter(
    (n) => namesB.has(n) && namesB.get(n) !== namesA.get(n),
  )

  console.log(`\n🔍 字段对比`)
  console.log(`   旧: ${fileA}  (${a.length} 字段)`)
  console.log(`   新: ${fileB}  (${b.length} 字段)\n`)

  if (removed.length === 0 && added.length === 0 && retyped.length === 0) {
    console.log("✅ 字段名完全一致 —— 无需改代码,放入新 PDF、注册新年份即可。")
    return
  }

  if (removed.length) {
    console.log(`❌ 旧表有、新表没有 (${removed.length}) —— 映射可能失效:`)
    for (const n of removed) console.log(`   - ${n}  [${namesA.get(n)}]`)
    console.log()
  }
  if (added.length) {
    console.log(`➕ 新表新增 (${added.length}):`)
    for (const n of added) console.log(`   + ${n}  [${namesB.get(n)}]`)
    console.log()
  }
  if (retyped.length) {
    console.log(`⚠️  同名但类型变了 (${retyped.length}):`)
    for (const n of retyped)
      console.log(`   ~ ${n}  ${namesA.get(n)} → ${namesB.get(n)}`)
    console.log()
  }
  console.log("→ 需要相应更新 app/api/forms/ 里对应路由的字段映射。")
}

async function main() {
  const [, , fileA, fileB] = process.argv
  if (!fileA) {
    console.error(
      "用法:\n" +
        "  列出字段:  node scripts/inspect-pdf-fields.mjs <pdf>\n" +
        "  对比两年:  node scripts/inspect-pdf-fields.mjs <旧pdf> <新pdf>",
    )
    process.exit(1)
  }

  const resolve = (p) => path.resolve(process.cwd(), p)
  const a = await readFields(resolve(fileA))

  if (fileB) {
    const b = await readFields(resolve(fileB))
    printDiff(fileA, a, fileB, b)
  } else {
    printList(fileA, a)
  }
}

main().catch((err) => {
  console.error("出错:", err.message)
  process.exit(1)
})
