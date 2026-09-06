function T = runMiddleEarExperiments(outDir)
%RUNMIDDLEEAREXPERIMENTS  Part 4 parameter experiments on the middle ear.
%
%   T = RUNMIDDLEEAREXPERIMENTS runs four single-parameter experiments,
%   prints a comparison table and saves fig4_experiments.png. T is a table
%   of the change in transmission (dB) at six frequencies.
%   RUNMIDDLEEAREXPERIMENTS(OUTDIR) saves the figure into OUTDIR.
%
%   The four experiments, one of each type the assignment asks for:
%
%     E1  L_te +20%   INERTANCE   ossicular mass, series path
%     E2  C_is x2     COMPLIANCE  incudo-stapedial joint, shunt path
%     E3  R_te x2     RESISTANCE  ossicular damping, series path
%     E4  C_cp x2     COMPLIANCE  middle-ear cavity, series path
%
%   E4 is run twice, once for each cavity placement. Under the series
%   placement (the default) it produces a real low-frequency change; under
%   the rejected shunt placement it produces exactly nothing, because a shunt
%   at the input node cannot affect the output of an ideal pressure source.
%   That contrast is the argument about loading effects made concrete, and it
%   is printed as a footnote after the table.
%
%   Predictions are recorded in the comments beside each experiment BEFORE
%   the run, so the printed table is a real test of them.
%
%   See also MIDDLEEARRESPONSE, GENERATECOMBINEDFIGURES.

if nargin < 1, outDir = pwd; end
if ~exist(outDir, 'dir'), mkdir(outDir); end

f   = logspace(log10(20), log10(20000), 4096).';
p2  = middleEarParams();
dbv = @(x) 20*log10(max(abs(x), 1e-12));
fq  = [100 500 1000 2000 4000 10000];

R0 = middleEarResponse(p2, f);
g0 = dbv(R0.total);

% name, field, multiplier, colour, prediction
exps = {
 'E1  L_te +20%  (inertance)', 'L_te', 1.20, [0.85 0.33 0.10], ...
   ['more ossicular mass -> the series mass reactance jwL_te grows, so the ' ...
    'resonance 1/(2*pi*sqrt(L_te*C_te)) drops by 1/sqrt(1.2) = -8.7%, and ' ...
    'everything above it loses gain. Below resonance, stiffness rules and ' ...
    'nothing should change.']
 'E2  C_is x2    (compliance)', 'C_is', 2.00, [0.47 0.67 0.19], ...
   ['a more compliant joint is a BIGGER leak: the shunt impedance ' ...
    '1/(w*C_is) halves, so more drive is short-circuited away from the ' ...
    'stapes. Loss should grow with frequency and be negligible at 100 Hz.']
 'E3  R_te x2    (resistance)', 'R_te', 2.00, [0.49 0.18 0.56], ...
   ['more damping in the series path. R_te only competes with the reactances ' ...
    'near the ossicular resonance, where they cancel, so the peak should be ' ...
    'flattened and almost nothing should happen away from it.']
 'E4  C_cp x2    (cavity compliance)', 'C_cp', 2.00, [0.35 0.35 0.35], ...
   ['with the cavity IN SERIES the drum has to compress that air, so a ' ...
    'softer cavity is less series stiffness and should help at low ' ...
    'frequency, fading out above the ossicular resonance where mass, not ' ...
    'stiffness, sets the impedance. Because the cavity is not inside Zfwd, ' ...
    'whatever |Z_in| loses |H| should gain, exactly. Under the REJECTED ' ...
    'shunt placement the same change would do literally nothing to H -- ' ...
    'see the footnote printed after the table.']
};

nE = size(exps,1);
rows = zeros(nE, numel(fq));
zChg = zeros(nE, 1);
gAll = cell(nE,1);

fprintf('\n=========== Part 4: parameter experiments ===========\n');
fprintf('baseline: peak %+.1f dB at %.0f Hz\n\n', R0.peakGainDb, R0.fPeak);

for k = 1:nE
    q = p2;
    q.(exps{k,2}) = p2.(exps{k,2})*exps{k,3};
    Rq = middleEarResponse(q, f);
    gq = dbv(Rq.total);
    gAll{k} = gq;

    rows(k,:) = interp1(f, gq - g0, fq);
    zChg(k)   = 20*log10(interp1(f, abs(Rq.inputImpedance), 1000) / ...
                         interp1(f, abs(R0.inputImpedance), 1000));

    fprintf('%s\n', exps{k,1});
    fprintf('  PREDICTION: %s\n', wrapText(exps{k,5}, 68, '              '));
    fprintf('  RESULT    : peak %+.1f dB at %.0f Hz (was %+.1f at %.0f)\n', ...
            Rq.peakGainDb, Rq.fPeak, R0.peakGainDb, R0.fPeak);
    fprintf('              dH at %s Hz = %s dB\n', ...
            strjoin(compose('%g', fq), '/'), ...
            strjoin(compose('%+.2f', rows(k,:)), '/'));
    fprintf('              d|Z_in| at 1 kHz = %+.2f dB\n\n', zChg(k));
end

%% ---- E4 footnote: the same change under the rejected shunt placement ----
qs = p2; qs.cavityPlacement = 'shunt';
Rs0 = middleEarResponse(qs, f);
qs.C_cp = p2.C_cp*2;
Rs2 = middleEarResponse(qs, f);
dShunt = dbv(Rs2.total) - dbv(Rs0.total);
fprintf(['E4 footnote -- the SAME C_cp x2, with the cavity as a shunt at the\n' ...
         '  input node instead of in series:  max |dH| = %.5f dB across the\n' ...
         '  whole band, i.e. exactly nothing, while |Z_in| at 1 kHz moves\n' ...
         '  %+.2f dB. A shunt at the input node cannot change the output of\n' ...
         '  an ideal pressure source; it acts only through loading, and the\n' ...
         '  cascade H_outer x H_middle discards loading. The series placement\n' ...
         '  used here does not have that blind spot.\n\n'], ...
    max(abs(dShunt)), ...
    20*log10(interp1(f,abs(Rs2.inputImpedance),1000) / ...
             interp1(f,abs(Rs0.inputImpedance),1000)));

T = array2table(rows, 'VariableNames', ...
        compose('dH_%gHz', fq), 'RowNames', exps(:,1)');
T.dZin_1kHz_dB = zChg;
disp(T);

%% ---- figure ------------------------------------------------------------
fig = figure('Position', [100 100 1000 760], 'Color', 'w');
if exist('theme', 'file'), theme(fig, 'light'); end

for k = 1:nE
    subplot(2,2,k);
    semilogx(f, g0, '-', 'LineWidth', 2, 'Color', [0.2 0.2 0.2]); hold on
    semilogx(f, gAll{k}, '-', 'LineWidth', 2, 'Color', exps{k,4});
    grid on; xlim([20 20000]); ylim([-15 32]);
    xlabel('Frequency (Hz)'); ylabel('|H_{middle}| (dB)');
    title(exps{k,1}, 'FontSize', 10);
    legend({'baseline', 'modified'}, 'Location', 'southwest', 'FontSize', 8);
end
sgtitle('Part 4: one inertance, two compliances, one resistance');
saveas(fig, fullfile(outDir, 'fig4_experiments.png'));
close(fig);
fprintf('Figure written to %s\n', fullfile(outDir, 'fig4_experiments.png'));

end

% -------------------------------------------------------------------------
function out = wrapText(s, width, indent)
% Wrap a long prediction string for the console, base MATLAB only.
words = strsplit(s, ' ');
line = ''; out = '';
for i = 1:numel(words)
    if isempty(line)
        line = words{i};
    elseif numel(line) + 1 + numel(words{i}) <= width
        line = [line ' ' words{i}]; %#ok<AGROW>
    else
        out = [out line newline indent]; %#ok<AGROW>
        line = words{i};
    end
end
out = [out line];
end
