// Web Audio API Sound Effects Synthesizer for POS System
// Generates zero-latency, high-fidelity Apple Pay style payment chimes, scan beeps & button click sounds.

class SoundFXEngine {
    private ctx: AudioContext | null = null;
    private enabled: boolean = true;

    constructor() {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('kasa_sound_enabled');
            this.enabled = saved !== null ? saved === 'true' : true;
        }
    }

    private getContext(): AudioContext | null {
        if (typeof window === 'undefined') return null;
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    }

    public setEnabled(enabled: boolean) {
        this.enabled = enabled;
        if (typeof window !== 'undefined') {
            localStorage.setItem('kasa_sound_enabled', String(enabled));
        }
    }

    public isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Soft tactile button click / pop
     */
    public playClick() {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx) return;

        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(1000, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.03);

            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.03);
        } catch (e) {
            console.warn('SoundFX error:', e);
        }
    }

    /**
     * Crisp barcode scanner beep
     */
    public playScan() {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx) return;

        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(1760, ctx.currentTime); // High crisp A6 note

            gain.gain.setValueAtTime(0.18, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.06);
        } catch (e) {
            console.warn('SoundFX error:', e);
        }
    }

    /**
     * Apple Pay / POS Style Signature Success Chime (Two-tone crystal chime: E5 -> B5 / 659Hz -> 987Hz)
     */
    public playSuccess() {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx) return;

        try {
            const now = ctx.currentTime;

            // Tone 1: E5 (659.25 Hz)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(659.25, now);
            gain1.gain.setValueAtTime(0.25, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.25);

            // Tone 2: B5 (987.77 Hz) - Slight delay for classic Apple Pay / POS chime chord
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(987.77, now + 0.08);
            gain2.gain.setValueAtTime(0.3, now + 0.08);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.08);
            osc2.stop(now + 0.6);

            // Optional subtle harmonic resonance layer (E6 1318.5 Hz)
            const osc3 = ctx.createOscillator();
            const gain3 = ctx.createGain();
            osc3.type = 'triangle';
            osc3.frequency.setValueAtTime(1318.51, now + 0.08);
            gain3.gain.setValueAtTime(0.1, now + 0.08);
            gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc3.connect(gain3);
            gain3.connect(ctx.destination);
            osc3.start(now + 0.08);
            osc3.stop(now + 0.5);

        } catch (e) {
            console.warn('SoundFX error:', e);
        }
    }

    /**
     * Soft warning / error double thud
     */
    public playError() {
        if (!this.enabled) return;
        const ctx = this.getContext();
        if (!ctx) return;

        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.setValueAtTime(160, now + 0.08);

            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.25);
        } catch (e) {
            console.warn('SoundFX error:', e);
        }
    }
}

export const soundFX = new SoundFXEngine();
