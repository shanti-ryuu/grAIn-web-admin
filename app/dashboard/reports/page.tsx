'use client'

import { useState } from 'react'
import { Download, FileText, Calendar } from 'lucide-react'
import Table from '@/components/Table'
import Card from '@/components/Card'
import { useToast } from '@/hooks/useToast'

export default function ReportsPage() {
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerateReport = async () => {
    setIsGenerating(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      toast({
        title: 'Report generated',
        description: 'Your new report has been generated successfully.',
      })
    } catch (error) {
      toast({
        title: 'Generation failed',
        description: 'Failed to generate report. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = (reportName: string) => {
    toast({
      title: 'Download started',
      description: `Downloading ${reportName}...`,
    })
  }

  const columns = [
    { key: 'name', label: 'Report Name' },
    { key: 'date', label: 'Date' },
    {
      key: 'type',
      label: 'Type',
      render: (value: string) => (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 capitalize">
          {value}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Action',
      render: (_value: string, row: any) => (
        <button
          onClick={() => handleDownload(row.name)}
          className="flex items-center gap-2 text-[#166534] text-sm font-semibold hover:text-[#15803d] transition-colors"
        >
          <Download className="w-4 h-4" />
          Download
        </button>
      ),
    },
  ]

  const mockReports = [
    { id: '1', name: 'Monthly Performance Report', date: '2024-03-15', type: 'performance' },
    { id: '2', name: 'Device Analytics Summary', date: '2024-03-10', type: 'analytics' },
    { id: '3', name: 'Alert History Report', date: '2024-03-05', type: 'alerts' },
    { id: '4', name: 'User Activity Log', date: '2024-02-28', type: 'users' },
  ]

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#111827] mb-2">Reports</h1>
        <p className="text-base text-[#6b7280]">
          Generate and download system reports and analytics summaries.
        </p>
      </div>

      {/* Generate Report Button */}
      <Card className="p-6 bg-gradient-to-r from-[#f0fdf4] to-[#dcfce7] border-[#bbf7d0]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#166534] rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-[#166534] mb-1">Generate New Report</h3>
              <p className="text-sm text-[#166534]">
                Create a new custom report with the latest data.
              </p>
            </div>
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="px-6 py-2.5 bg-[#166534] text-white font-semibold rounded-lg hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#f0fdf4] rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#166534]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#111827]">{mockReports.length}</p>
              <p className="text-sm text-[#6b7280]">Total Reports</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#f0fdf4] rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#166534]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#111827]">Mar 2024</p>
              <p className="text-sm text-[#6b7280]">Last Generated</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#f0fdf4] rounded-lg flex items-center justify-center">
              <Download className="w-5 h-5 text-[#166534]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#111827]">12</p>
              <p className="text-sm text-[#6b7280]">Downloads</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Reports Table */}
      {mockReports.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-[#f0fdf4] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#166534]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#111827] mb-2">No Reports Available</h3>
          <p className="text-sm text-[#6b7280]">
            Generate your first report to get started.
          </p>
        </Card>
      ) : (
        <Table columns={columns} data={mockReports} title="Available Reports" />
      )}
    </div>
  )
}
