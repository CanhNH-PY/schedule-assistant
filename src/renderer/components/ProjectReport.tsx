import { useEffect, useState } from 'react'
import { Project, ProjectTask } from '../../types/index'

const api = (window as any).electronAPI

const STATUSES = ['Not Started', 'In Progress', 'Complete', 'Overdue', 'On Hold'] as const
const PRIORITIES = ['High', 'Medium', 'Low'] as const

// Row background (pastel) + Status cell color (solid) matching MISA template
const STATUS_ROW_BG: Record<string, string> = {
  'Complete':    '#E2EFDA',
  'In Progress': '#DDEBF7',
  'Not Started': '#FFFFC7',
  'Overdue':     '#FCE4D6',
  'On Hold':     '#FFE5B4',
}
const STATUS_CELL_BG: Record<string, string> = {
  'Complete':    '#70AD47',
  'In Progress': '#2E75B6',
  'Not Started': '#FFD966',
  'Overdue':     '#FF5252',
  'On Hold':     '#ED7D31',
}
const STATUS_CELL_TEXT: Record<string, string> = {
  'Complete':    '#fff',
  'In Progress': '#fff',
  'Not Started': '#333',
  'Overdue':     '#fff',
  'On Hold':     '#fff',
}

const PRIORITY_COLOR: Record<string, string> = {
  'High':   '#C00000',
  'Medium': '#ED7D31',
  'Low':    '#70AD47',
}

function duration(start: string, end: string): number {
  if (!start || !end) return 0
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000))
}

function fmt(d: string) { return (d || '').slice(5).replace('-', '/') }

const emptyTask = (): Partial<ProjectTask> & { task_name: string } => ({
  task_name: '', assigned_to: '', start_date: '', end_date: '',
  status: 'Not Started', priority: 'High', comments: '', sort_order: 0,
})

// ── Inline edit row ────────────────────────────────────────────────────────────
function TaskEditRow({ form, onChange, onSave, onCancel }: {
  form: any; onChange: (f: any) => void; onSave: () => void; onCancel: () => void
}) {
  return (
    <tr style={{ background: '#EEF2FF' }}>
      <td className="px-2 py-1.5" colSpan={9}>
        <div className="flex flex-wrap gap-1.5 items-center">
          <input autoFocus placeholder="Task name *" value={form.task_name}
            onChange={e => onChange({ ...form, task_name: e.target.value })}
            className="w-36 border border-slate-300 rounded px-2 py-1 text-xs" />
          <input placeholder="Assigned to" value={form.assigned_to}
            onChange={e => onChange({ ...form, assigned_to: e.target.value })}
            className="w-28 border border-slate-300 rounded px-2 py-1 text-xs" />
          <input type="date" value={form.start_date}
            onChange={e => onChange({ ...form, start_date: e.target.value })}
            className="w-30 border border-slate-300 rounded px-2 py-1 text-xs" />
          <input type="date" value={form.end_date}
            onChange={e => onChange({ ...form, end_date: e.target.value })}
            className="w-30 border border-slate-300 rounded px-2 py-1 text-xs" />
          <select value={form.status} onChange={e => onChange({ ...form, status: e.target.value })}
            className="border border-slate-300 rounded px-2 py-1 text-xs">
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={form.priority} onChange={e => onChange({ ...form, priority: e.target.value })}
            className="border border-slate-300 rounded px-2 py-1 text-xs">
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
          <input placeholder="Comments" value={form.comments}
            onChange={e => onChange({ ...form, comments: e.target.value })}
            className="w-28 border border-slate-300 rounded px-2 py-1 text-xs" />
          <button onClick={onSave} className="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded">✓ Save</button>
          <button onClick={onCancel} className="border border-slate-300 text-slate-500 text-xs px-2 py-1.5 rounded">✕</button>
        </div>
      </td>
    </tr>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ProjectReport() {
  const [projects,      setProjects]      = useState<Project[]>([])
  const [selectedId,    setSelectedId]    = useState<number | null>(null)
  const [tasks,         setTasks]         = useState<ProjectTask[]>([])
  const [editingId,     setEditingId]     = useState<number | 'new' | null>(null)
  const [showProjForm,  setShowProjForm]  = useState(false)
  const [editingProj,   setEditingProj]   = useState(false)
  const [taskForm,      setTaskForm]      = useState<any>(emptyTask())
  const [projForm,      setProjForm]      = useState({ name: '', budget_planned: 0, budget_actual: 0 })
  const [exporting,     setExporting]     = useState<'pdf'|'excel'|null>(null)

  const project = projects.find(p => p.id === selectedId) ?? null

  useEffect(() => { load() }, [])
  useEffect(() => { selectedId ? loadTasks(selectedId) : setTasks([]) }, [selectedId])

  async function load() {
    const data = await api.getProjects()
    setProjects(data || [])
    if (data?.length && !selectedId) setSelectedId(data[0].id)
  }
  async function loadTasks(id: number) {
    const data = await api.getProjectTasks(id)
    setTasks(data || [])
  }

  async function createProject() {
    if (!projForm.name.trim()) return
    const res = await api.createProject(projForm)
    setShowProjForm(false); setProjForm({ name: '', budget_planned: 0, budget_actual: 0 })
    await load(); if (res?.id) setSelectedId(res.id)
  }
  async function saveProject() {
    if (!selectedId) return
    await api.updateProject(selectedId, projForm)
    setEditingProj(false); load()
  }
  async function deleteProject() {
    if (!project || !confirm('Xoá project và toàn bộ tasks?')) return
    await api.deleteProject(project.id); setSelectedId(null); load()
  }

  async function saveTask() {
    if (!selectedId || !taskForm.task_name?.trim()) return
    if (editingId === 'new') await api.createProjectTask({ ...taskForm, project_id: selectedId })
    else if (typeof editingId === 'number') await api.updateProjectTask(editingId, taskForm)
    setEditingId(null); setTaskForm(emptyTask()); loadTasks(selectedId)
  }
  async function deleteTask(id: number) {
    if (!selectedId) return
    await api.deleteProjectTask(id); loadTasks(selectedId)
  }
  function editTask(t: ProjectTask) {
    setTaskForm({ task_name: t.task_name, assigned_to: t.assigned_to, start_date: t.start_date,
      end_date: t.end_date, status: t.status, priority: t.priority, comments: t.comments, sort_order: t.sort_order })
    setEditingId(t.id)
  }

  async function doExportPDF() {
    if (!selectedId) return; setExporting('pdf')
    const res = await api.exportProjectPDF(selectedId); setExporting(null)
    if (res?.error) alert(res.error)
  }
  async function doExportExcel() {
    if (!selectedId) return; setExporting('excel')
    const res = await api.exportProjectExcel(selectedId); setExporting(null)
    if (res?.error) alert(res.error)
  }

  const total = tasks.length
  const statusCounts = Object.fromEntries(STATUSES.map(s => [s, tasks.filter(t => t.status === s).length]))
  const priorityCounts = Object.fromEntries(PRIORITIES.map(p => [p, tasks.filter(t => t.priority === p).length]))

  return (
    <div className="p-3 space-y-3 text-xs">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={selectedId || ''} onChange={e => { setSelectedId(Number(e.target.value)||null); setEditingId(null) }}
          className="flex-1 min-w-0 border border-slate-300 rounded px-2 py-1.5 text-sm bg-white font-medium">
          <option value="">— Chọn project —</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={() => { setShowProjForm(v=>!v); setEditingProj(false) }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded text-xs">+ New</button>
        {project && !showProjForm && <>
          <button onClick={() => { setProjForm({ name: project.name, budget_planned: project.budget_planned, budget_actual: project.budget_actual }); setEditingProj(v=>!v); setShowProjForm(false) }}
            className="border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-50 text-xs">Edit</button>
          <button onClick={deleteProject}
            className="border border-red-200 text-red-500 px-3 py-1.5 rounded hover:bg-red-50 text-xs">Delete</button>
        </>}
        {project && <>
          <button onClick={doExportPDF} disabled={!!exporting}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded text-xs ml-auto">
            {exporting==='pdf'?'⏳ ...':'📄 PDF'}
          </button>
          <button onClick={doExportExcel} disabled={!!exporting}
            className="bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded text-xs">
            {exporting==='excel'?'⏳ ...':'📊 Excel'}
          </button>
        </>}
      </div>

      {/* ── Project form ── */}
      {(showProjForm || editingProj) && (
        <div className="border border-indigo-200 rounded-lg p-3 bg-indigo-50 space-y-2">
          <p className="font-bold text-indigo-700 uppercase tracking-wide">{showProjForm ? 'New Project' : 'Edit Project'}</p>
          <input autoFocus placeholder="Tên project *" value={projForm.name} onChange={e => setProjForm(p=>({...p,name:e.target.value}))}
            className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white" />
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-slate-500 block mb-0.5">Ngân sách kế hoạch</label>
              <input type="number" value={projForm.budget_planned} onChange={e => setProjForm(p=>({...p,budget_planned:Number(e.target.value)}))}
                className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white" /></div>
            <div><label className="text-slate-500 block mb-0.5">Ngân sách thực tế</label>
              <input type="number" value={projForm.budget_actual} onChange={e => setProjForm(p=>({...p,budget_actual:Number(e.target.value)}))}
                className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white" /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={showProjForm ? createProject : saveProject}
              className="flex-1 bg-indigo-600 text-white py-1.5 rounded font-bold">{showProjForm?'Tạo':'Lưu'}</button>
            <button onClick={() => { setShowProjForm(false); setEditingProj(false) }}
              className="flex-1 border border-slate-300 py-1.5 rounded text-slate-600">Huỷ</button>
          </div>
        </div>
      )}

      {!project && !showProjForm && (
        <div className="py-12 text-center text-slate-400">
          <p className="text-3xl mb-2">📋</p>
          <p className="font-medium">Chưa có project. Nhấn <strong>+ New</strong> để tạo.</p>
        </div>
      )}

      {project && (
        <>
          {/* ── Report title ── */}
          <div className="px-4 py-2.5 font-bold text-white text-sm tracking-widest" style={{ background: '#1F3864' }}>
            MẪU BÁO CÁO DỰ ÁN — {project.name.toUpperCase()}
          </div>

          {/* ── Task table ── */}
          <div className="border border-slate-300 overflow-hidden rounded-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-max">
                <thead>
                  <tr style={{ background: '#1F3864', color: '#fff' }}>
                    <th className="px-3 py-2 text-left font-bold border-r border-blue-800 whitespace-nowrap w-40">TASK NAME</th>
                    <th className="px-3 py-2 text-left font-bold border-r border-blue-800 whitespace-nowrap">ASSIGNED TO</th>
                    <th className="px-3 py-2 text-center font-bold border-r border-blue-800 whitespace-nowrap">START DATE</th>
                    <th className="px-3 py-2 text-center font-bold border-r border-blue-800 whitespace-nowrap">END DATE</th>
                    <th className="px-3 py-2 text-center font-bold border-r border-blue-800 whitespace-nowrap">DURATION<br/><span style={{fontWeight:400,fontSize:10}}>in days</span></th>
                    <th className="px-3 py-2 text-center font-bold border-r border-blue-800 whitespace-nowrap">STATUS</th>
                    <th className="px-3 py-2 text-center font-bold border-r border-blue-800 whitespace-nowrap">PRIORITY</th>
                    <th className="px-3 py-2 text-left font-bold whitespace-nowrap">COMMENTS</th>
                    <th className="px-2 py-2 text-center font-bold w-12 border-l border-blue-800"></th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task, idx) => {
                    if (editingId === task.id) return <TaskEditRow key={task.id} form={taskForm} onChange={setTaskForm} onSave={saveTask} onCancel={() => { setEditingId(null); setTaskForm(emptyTask()) }} />
                    const dur = duration(task.start_date, task.end_date)
                    const rowBg = STATUS_ROW_BG[task.status] || '#fff'
                    return (
                      <tr key={task.id} style={{ background: rowBg }}
                        className="border-b border-slate-200 hover:brightness-95 transition-all group">
                        <td className="px-3 py-1.5 border-r border-slate-200 font-medium text-slate-800">{task.task_name}</td>
                        <td className="px-3 py-1.5 border-r border-slate-200 text-slate-700">{task.assigned_to}</td>
                        <td className="px-3 py-1.5 border-r border-slate-200 text-center text-slate-700">{fmt(task.start_date)}</td>
                        <td className="px-3 py-1.5 border-r border-slate-200 text-center text-slate-700">{fmt(task.end_date)}</td>
                        <td className="px-3 py-1.5 border-r border-slate-200 text-center text-slate-700 font-medium">{dur || ''}</td>
                        <td className="px-3 py-1.5 border-r border-slate-200 text-center">
                          <span className="inline-block px-2 py-0.5 rounded font-bold text-xs whitespace-nowrap"
                            style={{ background: STATUS_CELL_BG[task.status], color: STATUS_CELL_TEXT[task.status] }}>
                            {task.status}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 border-r border-slate-200 text-center font-bold"
                          style={{ color: PRIORITY_COLOR[task.priority] }}>
                          {task.priority}
                        </td>
                        <td className="px-3 py-1.5 border-r border-slate-200 text-slate-600 max-w-32 truncate">{task.comments}</td>
                        <td className="px-2 py-1.5 border-l border-slate-200 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                            <button onClick={() => editTask(task)} className="text-blue-400 hover:text-blue-600 text-base leading-none">✎</button>
                            <button onClick={() => deleteTask(task.id)} className="text-red-300 hover:text-red-500 text-base leading-none">✕</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {editingId === 'new' && <TaskEditRow form={taskForm} onChange={setTaskForm} onSave={saveTask} onCancel={() => { setEditingId(null); setTaskForm(emptyTask()) }} />}
                  {tasks.length === 0 && editingId !== 'new' && (
                    <tr><td colSpan={9} className="px-4 py-6 text-center text-slate-400">Chưa có task. Nhấn "+ Thêm task" bên dưới.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2 bg-slate-50 border-t border-slate-200">
              <button onClick={() => { setTaskForm(emptyTask()); setEditingId('new') }}
                className="text-indigo-600 hover:text-indigo-800 font-semibold">+ Thêm task</button>
            </div>
          </div>

          {/* ── Summary 2×2 grid ── */}
          <div className="grid grid-cols-2 gap-3">

            {/* TÌNH TRẠNG HOÀN THÀNH % */}
            <div className="border border-slate-300 overflow-hidden rounded-sm">
              <div className="px-3 py-2 font-bold text-slate-800 uppercase tracking-wide text-xs" style={{ background: '#D9E1F2' }}>
                TÌNH TRẠNG HOÀN THÀNH %
              </div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ background: '#1F3864', color: '#fff' }}>
                    <th className="px-3 py-1.5 text-left font-bold border-r border-blue-800">STATUS</th>
                    <th className="px-3 py-1.5 text-center font-bold border-r border-blue-800 w-16">COUNT</th>
                    <th className="px-3 py-1.5 text-center font-bold w-12">%</th>
                  </tr>
                </thead>
                <tbody>
                  {STATUSES.map(s => (
                    <tr key={s} style={{ background: STATUS_ROW_BG[s] }} className="border-b border-slate-200">
                      <td className="px-3 py-1.5 border-r border-slate-200">
                        <span className="inline-block px-2 py-0.5 rounded font-bold text-xs"
                          style={{ background: STATUS_CELL_BG[s], color: STATUS_CELL_TEXT[s] }}>{s}</span>
                      </td>
                      <td className="px-3 py-1.5 text-center border-r border-slate-200 font-medium">{statusCounts[s]}</td>
                      <td className="px-3 py-1.5 text-center text-slate-600">{total ? Math.round(statusCounts[s]/total*100) : 0}%</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#D9E1F2' }} className="font-bold border-t-2 border-slate-300">
                    <td className="px-3 py-1.5 border-r border-slate-200">TOTAL</td>
                    <td className="px-3 py-1.5 text-center border-r border-slate-200">{total}</td>
                    <td className="px-3 py-1.5 text-center">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* NGÂN SÁCH */}
            <div className="border border-slate-300 overflow-hidden rounded-sm self-start">
              <div className="px-3 py-2 font-bold text-slate-800 uppercase tracking-wide text-xs" style={{ background: '#D9E1F2' }}>
                NGÂN SÁCH
              </div>
              <table className="w-full text-xs border-collapse">
                <tbody>
                  <tr style={{ background: '#E2EFDA' }} className="border-b border-slate-200">
                    <td className="px-3 py-2 font-bold border-r border-slate-200" style={{ color: '#375623' }}>Kế hoạch</td>
                    <td className="px-3 py-2 text-right font-bold" style={{ color: '#375623' }}>
                      {Number(project.budget_planned).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                  <tr style={{ background: '#DDEBF7' }}>
                    <td className="px-3 py-2 font-bold border-r border-slate-200" style={{ color: '#1F497D' }}>Thực tế</td>
                    <td className={`px-3 py-2 text-right font-bold`}
                      style={{ color: project.budget_actual > project.budget_planned ? '#C00000' : '#1F497D' }}>
                      {Number(project.budget_actual).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                  {project.budget_planned > 0 && (
                    <tr style={{ background: '#F8FAFC' }}>
                      <td colSpan={2} className="px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 rounded-full h-2">
                            <div className="h-2 rounded-full"
                              style={{
                                width: Math.min(100, Math.round(project.budget_actual/project.budget_planned*100))+'%',
                                background: project.budget_actual > project.budget_planned ? '#C00000' : '#70AD47',
                              }} />
                          </div>
                          <span className="font-bold whitespace-nowrap"
                            style={{ color: project.budget_actual > project.budget_planned ? '#C00000' : '#375623' }}>
                            {Math.round(project.budget_actual/project.budget_planned*100)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* NHIỆM VỤ ƯU TIÊN % */}
            <div className="border border-slate-300 overflow-hidden rounded-sm">
              <div className="px-3 py-2 font-bold text-slate-800 uppercase tracking-wide text-xs" style={{ background: '#D9E1F2' }}>
                NHIỆM VỤ ƯU TIÊN %
              </div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ background: '#1F3864', color: '#fff' }}>
                    <th className="px-3 py-1.5 text-left font-bold border-r border-blue-800">PRIORITY</th>
                    <th className="px-3 py-1.5 text-center font-bold border-r border-blue-800 w-16">COUNT</th>
                    <th className="px-3 py-1.5 text-left font-bold">%</th>
                  </tr>
                </thead>
                <tbody>
                  {PRIORITIES.map(p => {
                    const cnt = priorityCounts[p]
                    const pct = total ? Math.round(cnt/total*100) : 0
                    const bg = p === 'High' ? '#FCE4D6' : p === 'Medium' ? '#FFF2CC' : '#E2EFDA'
                    const cc = p === 'High' ? '#C00000' : p === 'Medium' ? '#ED7D31' : '#70AD47'
                    return (
                      <tr key={p} style={{ background: bg }} className="border-b border-slate-200">
                        <td className="px-3 py-1.5 border-r border-slate-200 font-bold" style={{ color: cc }}>{p}</td>
                        <td className="px-3 py-1.5 text-center border-r border-slate-200 font-medium">{cnt}</td>
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full" style={{ width: pct+'%', background: cc }} />
                            </div>
                            <span style={{ color: cc }} className="font-bold w-8 text-right">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* CÁC MỤC ĐANG CHỜ */}
            <div className="border border-slate-300 overflow-hidden rounded-sm self-start">
              <div className="px-3 py-2 font-bold text-slate-800 uppercase tracking-wide text-xs" style={{ background: '#D9E1F2' }}>
                CÁC MỤC ĐANG CHỜ
              </div>
              <table className="w-full text-xs border-collapse">
                <tbody>
                  <tr style={{ background: STATUS_ROW_BG['Not Started'] }} className="border-b border-slate-200">
                    <td className="px-3 py-2 border-r border-slate-200">
                      <span className="inline-block px-2 py-0.5 rounded font-bold text-xs"
                        style={{ background: STATUS_CELL_BG['Not Started'], color: STATUS_CELL_TEXT['Not Started'] }}>
                        Not Started
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-slate-700 w-12">{statusCounts['Not Started']}</td>
                  </tr>
                  <tr style={{ background: STATUS_ROW_BG['On Hold'] }} className="border-b border-slate-200">
                    <td className="px-3 py-2 border-r border-slate-200">
                      <span className="inline-block px-2 py-0.5 rounded font-bold text-xs"
                        style={{ background: STATUS_CELL_BG['On Hold'], color: STATUS_CELL_TEXT['On Hold'] }}>
                        On Hold
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-slate-700 w-12">{statusCounts['On Hold']}</td>
                  </tr>
                  <tr style={{ background: STATUS_ROW_BG['Overdue'] }}>
                    <td className="px-3 py-2 border-r border-slate-200">
                      <span className="inline-block px-2 py-0.5 rounded font-bold text-xs"
                        style={{ background: STATUS_CELL_BG['Overdue'], color: STATUS_CELL_TEXT['Overdue'] }}>
                        Overdue
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-slate-700 w-12">{statusCounts['Overdue']}</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </>
      )}
    </div>
  )
}
