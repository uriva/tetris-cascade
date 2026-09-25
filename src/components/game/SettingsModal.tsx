'use client';

import React from 'react';
import { GameSettings } from '@/lib/tetris/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Volume2, Music, Sparkles, Monitor, Layers, Keyboard, Activity, Mouse } from 'lucide-react';
import { sound } from '@/lib/sound/synth';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onOpenChange,
  settings,
  onUpdateSettings,
}) => {
  const handleSoundToggle = (checked: boolean) => {
    onUpdateSettings({ soundEnabled: checked });
    sound.setSoundEnabled(checked);
  };

  const handleMusicToggle = (checked: boolean) => {
    onUpdateSettings({ musicEnabled: checked });
    sound.setMusicEnabled(checked);
  };

  const handleSfxVolume = (val: number | readonly number[]) => {
    const vol = typeof val === 'number' ? val : val[0];
    onUpdateSettings({ sfxVolume: vol });
    sound.setSfxVolume(vol);
  };

  const handleMusicVolume = (val: number | readonly number[]) => {
    const vol = typeof val === 'number' ? val : val[0];
    onUpdateSettings({ musicVolume: vol });
    sound.setMusicVolume(vol);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#0a0d14]/95 border border-white/10 text-white backdrop-blur-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-mono tracking-wider text-cyan-400 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            ARCADE SETTINGS
          </DialogTitle>
          <DialogDescription className="text-xs text-white/50">
            Configure game physics, audio synthesizer, and visual enhancements.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2 max-h-[75vh] overflow-y-auto pr-1">
          {/* Gravity Mode Selector */}
          <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30">
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-300 mb-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              GRAVITY MECHANIC
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => onUpdateSettings({ gravityMode: 'connected' })}
                className={`p-2 rounded-lg border text-left transition-all ${
                  settings.gravityMode !== 'individual'
                    ? 'border-cyan-400 bg-cyan-500/20 text-white font-bold'
                    : 'border-white/10 bg-black/30 text-white/60 hover:text-white'
                }`}
              >
                <div className="font-semibold text-cyan-300">Connected Cascade</div>
                <div className="text-[10px] text-white/50 mt-0.5">
                  Bricks only fall if nothing holds them down or from the side.
                </div>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ gravityMode: 'individual' })}
                className={`p-2 rounded-lg border text-left transition-all ${
                  settings.gravityMode === 'individual'
                    ? 'border-purple-400 bg-purple-500/20 text-white font-bold'
                    : 'border-white/10 bg-black/30 text-white/60 hover:text-white'
                }`}
              >
                <div className="font-semibold text-purple-300">Free Fall Sand</div>
                <div className="text-[10px] text-white/50 mt-0.5">
                  Individual bricks drop into any gap below.
                </div>
              </button>
            </div>
          </div>

          {/* Audio Controls */}
          <div className="flex flex-col gap-3 p-3 rounded-xl bg-black/30 border border-white/5">
            <div className="text-xs font-bold tracking-wider text-white/60 uppercase">Audio Engine</div>

            {/* Sound FX */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Volume2 className="w-4 h-4 text-amber-400" />
                <span>Sound FX</span>
              </div>
              <Switch checked={settings.soundEnabled} onCheckedChange={handleSoundToggle} />
            </div>

            {settings.soundEnabled && (
              <div className="flex items-center gap-3 pl-6">
                <span className="text-[10px] text-white/40">VOL</span>
                <Slider
                  value={[settings.sfxVolume]}
                  min={0}
                  max={1}
                  step={0.05}
                  onValueChange={handleSfxVolume}
                  className="w-full"
                />
              </div>
            )}

            {/* Retro Synth BGM */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 text-sm">
                <Music className="w-4 h-4 text-purple-400" />
                <span>Retro Synth BGM</span>
              </div>
              <Switch checked={settings.musicEnabled} onCheckedChange={handleMusicToggle} />
            </div>

            {settings.musicEnabled && (
              <div className="flex items-center gap-3 pl-6">
                <span className="text-[10px] text-white/40">VOL</span>
                <Slider
                  value={[settings.musicVolume]}
                  min={0}
                  max={1}
                  step={0.05}
                  onValueChange={handleMusicVolume}
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* Visual Effects */}
          <div className="flex flex-col gap-3 p-3 rounded-xl bg-black/30 border border-white/5">
            <div className="text-xs font-bold tracking-wider text-white/60 uppercase">Visual Effects</div>

            {/* Ghost Piece */}
            <div className="flex items-center justify-between">
              <span className="text-sm">Ghost Piece Projection</span>
              <Switch
                checked={settings.ghostPiece}
                onCheckedChange={checked => onUpdateSettings({ ghostPiece: checked })}
              />
            </div>

            {/* Screen Shake */}
            <div className="flex items-center justify-between">
              <span className="text-sm">Impact Screen Shake</span>
              <Switch
                checked={settings.screenShake}
                onCheckedChange={checked => onUpdateSettings({ screenShake: checked })}
              />
            </div>

            {/* CRT Scanline Filter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Monitor className="w-4 h-4 text-cyan-400" />
                <span>CRT Scanlines</span>
              </div>
              <Switch
                checked={settings.crtEffect}
                onCheckedChange={checked => onUpdateSettings({ crtEffect: checked })}
              />
            </div>

            {/* Particles */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span>Debris Particles</span>
              </div>
              <Switch
                checked={settings.particlesEnabled}
                onCheckedChange={checked => onUpdateSettings({ particlesEnabled: checked })}
              />
            </div>
          </div>

          {/* Mouse Controls */}
          <div className="flex flex-col gap-3 p-3 rounded-xl bg-black/30 border border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-cyan-300">
                <Mouse className="w-4 h-4 text-cyan-400" />
                <span>Mouse Pointer Control</span>
              </div>
              <Switch
                checked={settings.mouseControl}
                onCheckedChange={checked => onUpdateSettings({ mouseControl: checked })}
              />
            </div>

            {settings.mouseControl && (
              <div className="flex flex-col gap-2 pt-1 border-t border-white/5">
                <div className="text-xs text-white/70">Left Click Action:</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ mouseClickAction: 'rotate' })}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      settings.mouseClickAction === 'rotate'
                        ? 'border-cyan-400 bg-cyan-500/20 text-white font-bold'
                        : 'border-white/10 bg-black/30 text-white/60 hover:text-white'
                    }`}
                  >
                    <div className="font-semibold text-cyan-300">Rotate CW</div>
                    <div className="text-[10px] text-white/50">Right click drops</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ mouseClickAction: 'drop' })}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      settings.mouseClickAction === 'drop'
                        ? 'border-cyan-400 bg-cyan-500/20 text-white font-bold'
                        : 'border-white/10 bg-black/30 text-white/60 hover:text-white'
                    }`}
                  >
                    <div className="font-semibold text-cyan-300">Hard Drop</div>
                    <div className="text-[10px] text-white/50">Right click rotates</div>
                  </button>
                </div>

                <div className="text-[11px] text-white/50 space-y-0.5 pt-1">
                  <div>• Move mouse horizontally to steer piece column</div>
                  <div>• Mouse wheel: Scroll down to soft drop, up to rotate CCW</div>
                  <div>• Middle click: Hold piece</div>
                </div>
              </div>
            )}
          </div>

          {/* Keybindings Reference */}
          <div className="p-3 rounded-xl bg-black/30 border border-white/5">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-white/60 uppercase mb-2">
              <Keyboard className="w-4 h-4 text-white/40" />
              Keyboard Controls
            </div>
            <div className="grid grid-cols-2 gap-y-1.5 text-[11px] text-white/70">
              <div><span className="font-mono text-cyan-300">← / →</span> or <span className="font-mono text-cyan-300">A / D</span>: Move</div>
              <div><span className="font-mono text-cyan-300">↓</span> or <span className="font-mono text-cyan-300">S</span>: Soft Drop</div>
              <div><span className="font-mono text-cyan-300">Space</span>: Hard Drop</div>
              <div><span className="font-mono text-cyan-300">↑</span> or <span className="font-mono text-cyan-300">W / X</span>: Rotate CW</div>
              <div><span className="font-mono text-cyan-300">Z</span>: Rotate CCW</div>
              <div><span className="font-mono text-cyan-300">C</span> or <span className="font-mono text-cyan-300">Shift</span>: Hold Piece</div>
              <div><span className="font-mono text-cyan-300">A</span> (in rot): 180° Rotate</div>
              <div><span className="font-mono text-cyan-300">P</span> or <span className="font-mono text-cyan-300">Esc</span>: Pause / Menu</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
