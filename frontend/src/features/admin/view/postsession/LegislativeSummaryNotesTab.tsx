import React from 'react';
import { SubTopicItem } from '../../viewmodel/usePostSessionViewModel';
import { SearchBar } from '../../../../components/common/SearchBar';
import { Card } from '../../../../components/common/Card';
import { Badge } from '../../../../components/common/Badge';
import { BookOpen, MessageSquare } from 'lucide-react';

interface LegislativeSummaryNotesTabProps {
  subTopics:         SubTopicItem[];
  searchQuery:       string;
  onSearchChange:    (q: string) => void;
  activeCategory:    string;
  onCategoryChange:  (cat: string) => void;
  /** Dynamic category list derived from real agenda topics */
  categories?:       string[];
  /** True when no agenda-relevant speech exists at all */
  hasNoRelevantContent?: boolean;
}

export const LegislativeSummaryNotesTab: React.FC<LegislativeSummaryNotesTabProps> = ({
  subTopics,
  searchQuery,
  onSearchChange,
  activeCategory,
  onCategoryChange,
  categories = ["ALL"],
  hasNoRelevantContent = false,
}) => {
  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-amber-500/30 shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold shadow-sm">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <span>Executive Summary Notes</span>
              <Badge variant="success">Agenda-Relevant Discussions Only</Badge>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Only speech matching the current parliamentary agenda is included. Off-topic segments are excluded.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-center px-3 py-1.5 rounded-lg bg-white border border-gray-200">
            <span className="text-[10px] text-gray-400 uppercase block">Agenda Topics</span>
            <span className="text-sm font-mono font-bold text-amber-400">{subTopics.length}</span>
          </div>
          <div className="text-center px-3 py-1.5 rounded-lg bg-white border border-gray-200">
            <span className="text-[10px] text-gray-400 uppercase block">Discussion Points</span>
            <span className="text-sm font-mono font-bold text-emerald-400">
              {subTopics.reduce((acc, curr) => acc + curr.key_points.length, 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-gray-200">
        <SearchBar
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search agenda topics or discussion points..."
          className="flex-1 max-w-md"
        />
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === cat
                  ? "bg-amber-600 text-white shadow-sm font-bold"
                  : "bg-white text-gray-500 hover:text-gray-800 border border-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      {hasNoRelevantContent ? (
        /* No agenda-relevant speech at all in the session */
        <div className="p-10 text-center rounded-xl bg-white border border-gray-200">
          <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-700">No agenda-related discussion available yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Discussion points will appear here as members deliver speeches relevant to the parliamentary agenda.
          </p>
        </div>
      ) : subTopics.length === 0 ? (
        /* Filtered to zero by search/category */
        <div className="p-8 text-center rounded-xl bg-white border border-gray-200 text-gray-500">
          <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-700">No Notes Found</p>
          <p className="text-xs text-gray-400 mt-1">No notes match the selected category or search query.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subTopics.map((sub) => (
            <Card key={sub.id} className="p-4 bg-white border-gray-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Badge variant="gold" className="font-mono">{sub.id}</Badge>
                  <h3 className="text-xs font-bold text-gray-900">{sub.title}</h3>
                </div>
                <Badge variant="neutral">{sub.category}</Badge>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                  Key Discussion &amp; Evidence Points:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {sub.key_points.map((pt, pIdx) => {
                    const colonIdx = pt.indexOf(": ");
                    const titlePart = colonIdx > -1 ? pt.slice(0, colonIdx) : "";
                    const descPart  = colonIdx > -1 ? pt.slice(colonIdx + 2) : pt;
                    return (
                      <div
                        key={pIdx}
                        className="p-3 rounded-lg bg-white border border-gray-200/80 flex items-start gap-2.5 text-xs leading-relaxed"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 mt-2" />
                        <div>
                          {titlePart && (
                            <strong className="text-gray-800 font-bold">{titlePart}: </strong>
                          )}
                          <span className="text-gray-700">{descPart}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
