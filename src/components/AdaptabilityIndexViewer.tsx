/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Star, 
  Award, 
  MessageSquare, 
  CheckCircle2, 
  HeartHandshake, 
  UserCheck,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { AdaptabilityMetric } from '../types';
import { INITIAL_ADAPTABILITY_METRICS } from '../data/initialData';

export const AdaptabilityIndexViewer: React.FC = () => {
  const [metrics, setMetrics] = useState<AdaptabilityMetric[]>(INITIAL_ADAPTABILITY_METRICS);
  const [submittedFeedback, setSubmittedFeedback] = useState(false);
  const [peerName, setPeerName] = useState('Engineering Peer / Instructor');
  const [newComment, setNewComment] = useState('');

  const averageScore = Number(
    (metrics.reduce((acc, m) => acc + m.score, 0) / metrics.length).toFixed(1)
  );

  const handleScoreChange = (index: number, newScore: number) => {
    const updated = [...metrics];
    updated[index].score = newScore;
    setMetrics(updated);
  };

  const handleSubmitPeerReview = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedFeedback(true);
    setTimeout(() => setSubmittedFeedback(false), 4000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Assignment 3: Individual Adaptability Index (Peer Review)
            </div>
            <h2 className="text-xl font-bold text-white">
              Mid-Sprint Pivot Composure, Communication & Flexibility Evaluation
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              Confidential peer evaluation assessing psychological safety, composure under sudden scope shifts,
              and collaborative speed during the 48-hour Meridian Pivot.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-center shrink-0">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Aggregate Index</span>
            <div className="text-2xl font-black text-rose-400 mt-0.5">{averageScore} / 10.0</div>
            <span className="text-[10px] text-emerald-400 font-bold block">Top 5% Agile Tier</span>
          </div>
        </div>
      </div>

      {/* Main Rubric Metric Cards */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
          Peer Evaluation Criteria & Observable Evidence
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.map((metric, idx) => (
            <div
              key={metric.category}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 font-bold text-xs">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{metric.category}</h4>
                    <span className="text-[10px] text-slate-400">Core Adaptability Dimension</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 font-bold font-mono text-sm text-slate-900 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  {metric.score.toFixed(1)} / 10
                </div>
              </div>

              {/* Observation & Evidence */}
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="font-semibold text-slate-700 block mb-0.5">Behavioral Observation:</span>
                  <p className="text-slate-600 leading-relaxed">{metric.observation}</p>
                </div>

                <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100">
                  <span className="font-semibold text-emerald-900 block mb-0.5">Technical & Architectural Evidence:</span>
                  <p className="text-emerald-800 leading-relaxed">{metric.evidence}</p>
                </div>
              </div>

              {/* Interactive Score Slider */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>Adjust Peer Rating:</span>
                  <span className="font-bold text-slate-800">{metric.score.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="10"
                  step="0.1"
                  value={metric.score}
                  onChange={(e) => handleScoreChange(idx, parseFloat(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Peer Review Submission Box */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-rose-600" />
          Submit Confidential Peer Review / Rehire Endorsement
        </h3>

        <form onSubmit={handleSubmitPeerReview} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reviewer Name / Role</label>
              <input
                type="text"
                value={peerName}
                onChange={(e) => setPeerName(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Rehire Recommendation</label>
              <select className="w-full p-2.5 text-xs rounded-lg border border-slate-300 bg-white">
                <option>Strongly Recommend Rehire (Top Performer)</option>
                <option>Recommend Rehire</option>
                <option>Neutral</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sprint 2 Pivot Notes & Qualitative Feedback
            </label>
            <textarea
              rows={3}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="e.g. Handled the Day 4 webhook switch smoothly without panic, authoring complete Python and JavaScript implementations with zero downtime."
              className="w-full p-2.5 text-xs rounded-lg border border-slate-300"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            {submittedFeedback ? (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-pulse">
                <CheckCircle2 className="w-4 h-4" /> Peer Review Encrypted & Submitted to Sprint Rubric!
              </span>
            ) : <span />}

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
            >
              Submit Confidential Review
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
