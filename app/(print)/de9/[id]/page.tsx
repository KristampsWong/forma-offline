import { getDe9ById } from "@/actions/taxes/de9-read"
import De9Documents from "./de9-documents"

export default async function Page({
  params,
}: {
  params: Promise<{ id?: string }>
}) {
  const { id } = await params
  if (!id) {
    return null
  }
  const res = await getDe9ById(id)
  if (!res.success) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-2 text-gray-600">{res.error}</p>
        </div>
      </div>
    )
  }
  const { headerData, companyInfo, formData } = res.data
  return (
    <De9Documents
      headerData={headerData}
      companyInfo={companyInfo}
      formData={formData}
    />
  )
}
