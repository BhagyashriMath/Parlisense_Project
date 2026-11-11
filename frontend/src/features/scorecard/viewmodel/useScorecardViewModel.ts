import { useState } from 'react';
import { useParliament } from '../../../infrastructure/context/ParliamentContext';

export type ScorecardTab = 'marks' | 'summary' | 'rubric';

export function useScorecardViewModel() {
  const { activeScorecard, isScorecardOpen, closeScorecard } = useParliament();
  const [activeTab, setActiveTab] = useState<ScorecardTab>('marks');

  const downloadJSON = () => {
    if (!activeScorecard) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activeScorecard, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `scorecard-${activeScorecard.member_id}.json`);
    dlAnchor.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return {
    activeScorecard,
    isScorecardOpen,
    closeScorecard,
    activeTab,
    setActiveTab,
    downloadJSON,
    handlePrint
  };
}

export type ScorecardViewModel = ReturnType<typeof useScorecardViewModel>;
