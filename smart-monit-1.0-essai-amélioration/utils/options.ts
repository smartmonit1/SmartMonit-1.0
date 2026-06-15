export const generateNumberOptions = (min: number, max: number, step: number) => {
    const options = [];
    for (let i = min; i <= max; i += step) {
        options.push(Math.round(i * 100) / 100);
    }
    return options;
};

export const generateTimeOptionsMMSS = (minMinutes: number, maxMinutes: number, stepSeconds: number) => {
    const options = [];
    for (let i = minMinutes * 60; i <= maxMinutes * 60; i += stepSeconds) {
        const m = Math.floor(i / 60);
        const s = i % 60;
        options.push(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }
    return options;
};

export const generateTimeOptionsHHMMSS = (minMinutes: number, maxMinutes: number, stepSeconds: number) => {
    const options = [];
    for (let i = minMinutes * 60; i <= maxMinutes * 60; i += stepSeconds) {
        const h = Math.floor(i / 3600);
        const m = Math.floor((i % 3600) / 60);
        const s = i % 60;
        options.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }
    return options;
};
