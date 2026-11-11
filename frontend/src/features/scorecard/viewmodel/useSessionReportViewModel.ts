import { useParliament } from '../../../infrastructure/context/ParliamentContext';

export function useSessionReportViewModel() {
  const { activeReport, isReportOpen, closeReport } = useParliament();

  const downloadJSON = () => {
    if (!activeReport) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activeReport, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `${activeReport.report_id}.json`);
    dlAnchor.click();
  };

  const downloadCSV = () => {
    if (!activeReport) return;
    const info = activeReport.session_information || {
      session_id: (activeReport as any).session_id || "PARL-2026-8002"
    };
    const headers = 'Member ID,Name,Seat ID,Overall Score,Grade,Participation,Agenda Relevance,Speaking Discipline,Seat Compliance,Decorum\n';
    const rows = (activeReport.member_scorecards || []).map((sc: any) => {
      const c = sc.categories || {};
      const part = c.participation ?? sc.attendance_percentage ?? 95;
      const agenda = c.agenda_relevance ?? sc.agenda_relevance ?? 90;
      const time = c.speaking_discipline ?? sc.speaking_time_adherence ?? 92;
      const seat = c.seat_compliance ?? 98;
      const decorum = c.decorum_discipline ?? 94;
      return `${sc.member_id || ""},"${sc.name || ""}",${sc.seat_id || ""},${sc.overall_score ?? 90},"${sc.grade || "A"}",${part},${agenda},${time},${seat},${decorum}`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parliament-scorecards-${info.session_id}.csv`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return {
    activeReport,
    isReportOpen,
    closeReport,
    downloadJSON,
    downloadCSV,
    handlePrint
  };
}

export type SessionReportViewModel = ReturnType<typeof useSessionReportViewModel>;
