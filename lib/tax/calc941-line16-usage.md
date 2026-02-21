# 如何使用 calc941Line16 函数

## 在 taxfilling-sync.ts 中的使用示例

```typescript
import {
  calculate941Line16,
  checkHundredKRule,
  getMonthlyLiabilitiesForQuarter,
  calculateLookbackTotalTax,
  PayrollTaxLiability,
  Line16Result,
} from "@/lib/calc941"

// 在 createOrUpdateForm941FromApprovedPayrolls 函数中

// 1. 准备 payroll tax liabilities 数据
const payrollTaxLiabilities: PayrollTaxLiability[] = payrollRecords.map((payroll) => ({
  payDate: new Date(payroll.payPeriod.payDate),
  federalIncomeTax: payroll.deductions.taxes.federalIncomeTax,
  employeeSocialSecurityTax: payroll.deductions.taxes.socialSecurityTax,
  employerSocialSecurityTax: payroll.employerTaxes.socialSecurityTax,
  employeeMedicareTax: payroll.deductions.taxes.medicareTax,
  employerMedicareTax: payroll.employerTaxes.medicareTax,
}))

// 2. 检查是否触发 $100k 规则
const triggered100kRule = checkHundredKRule(payrollTaxLiabilities)

// 3. 计算月度税务负债
const rawMonthlyLiabilities = getMonthlyLiabilitiesForQuarter(payrollTaxLiabilities)

// 4. 获取 lookback period 的 Line 12 值（去年同期的 4 个季度）
// 例如：计算 2025 Q1，需要 2024 Q2, Q3, Q4 和 2025 Q1 的 Line 12
const lookbackQuarters = await Form941.find({
  companyId: company._id,
  year: { $in: [year - 1, year] },
  // 根据当前季度确定 lookback quarters
}).select("totalTaxesAfterAdjustmentsAndCredits")

const lookbackLine12Values = lookbackQuarters.map(
  (q) => q.totalTaxesAfterAdjustmentsAndCredits
)
const lookbackTotalTax = calculateLookbackTotalTax(lookbackLine12Values)

// 5. 获取上一季度的 Line 12
const priorQuarter = await Form941.findOne({
  companyId: company._id,
  year: quarter === "Q1" ? year - 1 : year,
  quarter: getPriorQuarter(quarter),
}).select("totalTaxesAfterAdjustmentsAndCredits")

const line12Prior = priorQuarter?.totalTaxesAfterAdjustmentsAndCredits || 0

// 6. 计算 Line 16
const line16Result: Line16Result = calculate941Line16(
  calc941Result.totalTaxesAfterAdjustmentsAndCredits, // line12Current
  line12Prior,
  lookbackTotalTax,
  triggered100kRule,
  rawMonthlyLiabilities
)

// 7. 保存到数据库
existingForm941.isSemiweeklyScheduleDepositor = line16Result.isSemiweeklyScheduleDepositor

if (line16Result.monthlyTaxLiability) {
  existingForm941.monthlyTaxLiability = line16Result.monthlyTaxLiability
}

if (line16Result.scheduleB) {
  existingForm941.scheduleB = line16Result.scheduleB
}
```

## Helper 函数：获取上一季度

```typescript
function getPriorQuarter(currentQuarter: "Q1" | "Q2" | "Q3" | "Q4"): "Q1" | "Q2" | "Q3" | "Q4" {
  switch (currentQuarter) {
    case "Q1": return "Q4"
    case "Q2": return "Q1"
    case "Q3": return "Q2"
    case "Q4": return "Q3"
  }
}
```

## Lookback Period 规则

IRS 的 lookback period 是指：
- 从去年 7月1日 到 今年 6月30日 的 12 个月期间
- 具体对应：
  - 2025年的 lookback period = 2024年 Q3 + Q4 + 2025年 Q1 + Q2 (总共4个季度)
  - 去年同期的4个季度的 Line 12 总和

## 返回值说明

`Line16Result` 接口包含：

```typescript
interface Line16Result {
  // 月度税务负债（仅月度存款人）
  monthlyTaxLiability?: {
    month1: number
    month2: number
    month3: number
    total: number
  }

  // 是否为半周存款人
  isSemiweeklyScheduleDepositor: boolean

  // Schedule B 数据（仅半周存款人）
  scheduleB?: {
    totalLiability: number
  }

  // 特殊标记：基于上季度的 de minimis，但当前 >= 100k
  requireLiabilityRecord?: boolean
}
```

## 三种情况的处理

### 1. 小额负债 (De Minimis)
- Line 12 < $2,500（当前或上一季度）且未触发 $100k 规则
- 可以随申报表一起支付，无需提前存款
- `isSemiweeklyScheduleDepositor = false`
- 不需要 `monthlyTaxLiability` 或 `scheduleB`

### 2. 月度存款人
- Lookback tax ≤ $50,000 且未触发 $100k 规则
- 需要填写 Line 16 月度明细
- `isSemiweeklyScheduleDepositor = false`
- 提供 `monthlyTaxLiability`

### 3. 半周存款人
- Lookback tax > $50,000 或触发 $100k 规则
- 需要提交 Schedule B
- `isSemiweeklyScheduleDepositor = true`
- 提供 `scheduleB`

## 注意事项

1. **保持公式不变**：所有计算逻辑完全来自 `line16.ts`，只是参数类型适配了你的数据库结构

2. **数据库字段匹配**：返回的 `Line16Result` 接口与 Form941 模型完全对应

3. **$100k 规则**：使用 `checkHundredKRule` 函数检查是否有任何一天的税务负债达到 $100k

4. **月度分组**：`getMonthlyLiabilitiesForQuarter` 自动按支付日期分组到季度的三个月

5. **Rounding**：所有金额都使用 `RoundingToCents` 函数处理，确保精度一致
