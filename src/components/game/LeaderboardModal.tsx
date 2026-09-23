'use client';

import React from 'react';
import { HighScoreEntry } from '@/lib/tetris/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy, Flame, Trash2 } from 'lucide-react';

interface LeaderboardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: HighScoreEntry[];
  onClear: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  open,
  onOpenChange,
  entries,
  onClear,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#0a0d14]/95 border border-white/10 text-white backdrop-blur-2xl shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-mono tracking-wider text-amber-400 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            HALL OF FAME
          </DialogTitle>
          <DialogDescription className="text-xs text-white/50">
            Top scores across all game sessions.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2 max-h-[60vh] overflow-y-auto">
          {entries.length === 0 ? (
            <div className="text-center py-8 text-white/30 font-mono text-sm">
              No scores recorded yet. Be the first!
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {entries.map((entry, idx) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-mono transition-colors ${
                    idx === 0
                      ? 'border-amber-400/40 bg-amber-950/20 text-amber-200'
                      : idx === 1
                      ? 'border-slate-300/30 bg-slate-800/20 text-slate-200'
                      : idx === 2
                      ? 'border-amber-700/30 bg-amber-900/10 text-amber-400'
                      : 'border-white/5 bg-black/30 text-white/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 font-bold text-center">
                      {idx === 0 ? '👑' : `#${idx + 1}`}
                    </span>
                    <div>
                      <div className="font-bold tracking-wider text-white">
                        {entry.playerName}
                      </div>
                      <div className="text-[10px] text-white/40 uppercase">
                        {entry.mode} • Lvl {entry.level} • {entry.lines} Lines
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-extrabold text-sm text-cyan-300">
                      {entry.score.toLocaleString()}
                    </div>
                    {entry.maxCascade > 1 && (
                      <div className="text-[10px] text-purple-400 flex items-center justify-end gap-1">
                        <Flame className="w-2.5 h-2.5" />
                        Cascade x{entry.maxCascade}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {entries.length > 0 && (
          <div className="flex justify-end pt-2 border-t border-white/5">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-xs text-rose-400/70 hover:text-rose-400 hover:bg-rose-950/30 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Leaderboard
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
