import { getEmployeeById } from "@/actions/employee"
// import { getEmployeePayrolls } from "@/actions/payroll"
import Avatar from "@/components/avatar"
// import Documents from "@/components/employee/documents"
// import { EmployeeActionMenu } from "@/components/employee/employee-action-menu"
import EmployeeProfileList from "@/components/employee/employee-profile-list"
// import PaycheckList from "@/components/employee/paycheck-list"
import Header from "@/components/header"
import Breadcrumb, {
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { TabNav } from "@/components/ui/tab-nav"

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams
  const activeTab = tab || "profile"




  if (!id) {
    return <div>Employee not found</div>
  }

  // Fetch employee data
  const result = await getEmployeeById({ employeeId: id })

  if (!result.success) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <p className="text-destructive">
          {result.error || "Employee not found"}
        </p>
      </div>
    )
  }

  const employee = result.employee
  // getEmployeePayrolls uses currentUser() internally for tenant isolation
  // const payrollsResult = await getEmployeePayrolls(id)
  // const paychecks =
  //   payrollsResult.success && payrollsResult.data ? payrollsResult.data : []
  // const hasPayrolls = paychecks.length > 0
  const fullName = `${employee.firstName} ${employee.lastName}`

  return (
    <main className="p-4 max-w-7xl mx-auto space-y-16 w-full">
      <Header>
        <Breadcrumb>
          <BreadcrumbLink href={"/employees"} text={"Employees"} />
          <BreadcrumbSeparator />
          <span className="text-foreground font-semibold">{fullName}</span>
        </Breadcrumb>
      </Header>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={employee.firstName} className="size-16 text-xl" />
          <div>
            <h1 className="text-2xl font-semibold">
              {employee.firstName} {employee.lastName}
            </h1>
            <span className="capitalize">{employee.employmentStatus}</span>
          </div>
        </div>
        {/* <EmployeeActionMenu
          hasPayrolls={hasPayrolls}
          fullName={fullName}
          employeeId={employee._id.toString()}
        /> */}
      </div>

      <TabNav
        tabs={[
          {
            value: "profile",
            label: "Profile",
            href: `/employees/${id}?tab=profile`,
          },
          {
            value: "paychecklist",
            label: "Paycheck List",
            href: `/employees/${id}?tab=paychecklist`,
          },
          {
            value: "documents",
            label: "Documents",
            href: `/employees/${id}?tab=documents`,
          },
        ]}
        activeTab={activeTab}
      />

      <div>
        {activeTab === "profile" && <EmployeeProfileList employee={employee} />}
        {/* {activeTab === "paychecklist" && (
          <PaycheckList paycheckList={paychecks} />
        )}
        {activeTab === "documents" && (
          <Documents
            employeeName={employee.firstName}
            employeeId={employee._id.toString()}
          />
        )} */}
      </div>
    </main>
  )
}
