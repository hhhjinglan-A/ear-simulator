function generateCombinedFigures(outDir)
%GENERATECOMBINEDFIGURES  Report figures for the outer + middle ear model.
%
%   GENERATECOMBINEDFIGURES saves PNG figures into the current folder.
%   GENERATECOMBINEDFIGURES(OUTDIR) saves them into OUTDIR.
%
%   Figures produced (magnitude in dB, unwrapped phase in degrees, log
%   frequency axis 20 Hz - 20 kHz):
%
%     fig1_outer_ear.png    outer ear alone, with its four mechanisms
%     fig2_middle_ear.png   middle ear alone: input impedance, transmission
%                           magnitude and transmission phase
%     fig3_combined.png     outer, middle and the cascaded product
%
%   Same plotting style as GENERATEFIGURES in the outer-ear folder.
%
%   See also COMBINEDEARRESPONSE, MIDDLEEARRESPONSE, RUNMIDDLEEAREXPERIMENTS.

if nargin < 1, outDir = pwd; end
if ~exist(outDir, 'dir'), mkdir(outDir); end

f  = logspace(log10(20), log10(20000), 4096).';
p1 = outerEarParams();
p2 = middleEarParams();

dbv = @(x) 20*log10(max(abs(x), 1e-12));
phs = @(x) unwrap(angle(x))*180/pi;

C  = combinedEarResponse(p1, p2, f);
R1 = C.outer;
R2 = C.middle;

%% Figure 1 - outer ear alone --------------------------------------------
fig = newFig([100 100 900 700]);

subplot(2,1,1);
semilogx(f, dbv(R1.reflector), '--', 'LineWidth', 1.2, 'Color', [0.85 0.33 0.10]); hold on
semilogx(f, dbv(R1.concha),    '--', 'LineWidth', 1.2, 'Color', [0.93 0.69 0.13]);
semilogx(f, dbv(R1.canal),     '--', 'LineWidth', 1.2, 'Color', [0.47 0.67 0.19]);
semilogx(f, dbv(R1.pinna),     '--', 'LineWidth', 1.2, 'Color', [0.49 0.18 0.56]);
semilogx(f, dbv(R1.total),     '-',  'LineWidth', 2.4, 'Color', [0 0.45 0.74]);
grid on; xlim([20 20000]);
ylabel('|H_{outer}| (dB)');
title('1. Outer ear alone:  P_{eardrum} / P_{free field}');
legend({'Concha reflector', 'Concha Helmholtz', 'Ear canal', ...
        'Pinna reflections', 'Combined'}, 'Location', 'southwest', 'FontSize', 9);

subplot(2,1,2);
semilogx(f, phs(R1.total), '-', 'LineWidth', 2, 'Color', [0 0.45 0.74]);
grid on; xlim([20 20000]);
xlabel('Frequency (Hz)'); ylabel('Phase (deg)');
title('Outer-ear phase');

saveas(fig, fullfile(outDir, 'fig1_outer_ear.png'));
close(fig);

%% Figure 2 - middle ear alone -------------------------------------------
fig = newFig([100 100 900 860]);

% Input impedance, both cavity placements: the transfer function hardly
% distinguishes them but the impedance does. See README, open question 1.
q = p2; q.cavityPlacement = 'shunt';
Rs = middleEarResponse(q, f);

subplot(3,1,1);
loglog(f, abs(R2.inputImpedance)*p2.Z_unitToSI, '-', ...
       'LineWidth', 2, 'Color', [0.64 0.08 0.18]); hold on
loglog(f, abs(Rs.inputImpedance)*p2.Z_unitToSI, '--', ...
       'LineWidth', 1.6, 'Color', [0.35 0.35 0.35]);
grid on; xlim([20 20000]);
ylabel('|Z_{in}| (Pa\cdots/m^3)');
title('2. Middle ear alone:  input impedance at the eardrum');
legend({'cavity in series (as built, Zwislocki)', ...
        'cavity as shunt (rejected variant)'}, ...
       'Location', 'southwest', 'FontSize', 9);

subplot(3,1,2);
semilogx(f, dbv(R2.ossicles), '--', 'LineWidth', 1.2, 'Color', [0.47 0.67 0.19]); hold on
semilogx(f, dbv(R2.joint),    '--', 'LineWidth', 1.2, 'Color', [0.49 0.18 0.56]);
semilogx(f, dbv(R2.eardrum),  '--', 'LineWidth', 1.2, 'Color', [0.93 0.69 0.13]);
yline(20*log10(p2.N), ':', sprintf('T_r = %d  (%.1f dB)', p2.N, 20*log10(p2.N)), ...
      'Color', [0.3 0.3 0.3], 'FontSize', 8, 'HandleVisibility', 'off');
semilogx(f, dbv(R2.total),    '-',  'LineWidth', 2.4, 'Color', [0.64 0.08 0.18]);
grid on; xlim([20 20000]); ylim([-32 34]);   % headroom so the legend is clear
ylabel('|H_{middle}| (dB)');
title('Transmission magnitude:  P_{vestibule} / P_{eardrum}');
legend({'Ossicles + cochlear load', 'cost of joint shunt', ...
        'cost of eardrum-loss shunt', 'Combined (incl. T_r)'}, ...
        'Location', 'southwest', 'FontSize', 8, 'NumColumns', 2);

subplot(3,1,3);
semilogx(f, phs(R2.total), '-', 'LineWidth', 2, 'Color', [0.64 0.08 0.18]);
grid on; xlim([20 20000]);
xlabel('Frequency (Hz)'); ylabel('Phase (deg)');
title('Transmission phase');

saveas(fig, fullfile(outDir, 'fig2_middle_ear.png'));
close(fig);

%% Figure 3 - combined ----------------------------------------------------
fig = newFig([100 100 900 700]);

subplot(2,1,1);
semilogx(f, dbv(C.Houter),  '--', 'LineWidth', 1.6, 'Color', [0 0.45 0.74]); hold on
semilogx(f, dbv(C.Hmiddle), '--', 'LineWidth', 1.6, 'Color', [0.64 0.08 0.18]);
semilogx(f, dbv(C.total),   '-',  'LineWidth', 2.6, 'Color', [0.1 0.1 0.1]);
grid on; xlim([20 20000]);
ylabel('Gain (dB)');
title('3. Cascaded model:  H_{total} = H_{outer} \times H_{middle}');
legend({'Outer ear', 'Middle ear', 'Combined'}, ...
       'Location', 'southwest', 'FontSize', 9);

subplot(2,1,2);
semilogx(f, phs(C.Houter),  '--', 'LineWidth', 1.4, 'Color', [0 0.45 0.74]); hold on
semilogx(f, phs(C.Hmiddle), '--', 'LineWidth', 1.4, 'Color', [0.64 0.08 0.18]);
semilogx(f, phs(C.total),   '-',  'LineWidth', 2.2, 'Color', [0.1 0.1 0.1]);
grid on; xlim([20 20000]);
xlabel('Frequency (Hz)'); ylabel('Phase (deg)');
title('Phase adds when the transfer functions multiply');

saveas(fig, fullfile(outDir, 'fig3_combined.png'));
close(fig);

%% ---- console summary ---------------------------------------------------
go = dbv(R1.total);
fprintf('Figures written to %s\n', outDir);
fprintf('  outer-ear peak         : %+6.1f dB at %5.0f Hz\n', ...
        max(go), f(find(go == max(go), 1)));
fprintf('  middle-ear peak        : %+6.1f dB at %5.0f Hz\n', ...
        R2.peakGainDb, R2.fPeak);
fprintf('  combined peak          : %+6.1f dB at %5.0f Hz\n', ...
        C.peakGainDb, C.fPeak);
fprintf('  |Z_in| at 1 kHz        : %.2e Pa*s/m^3\n', ...
        interp1(f, abs(R2.inputImpedance), 1000)*p2.Z_unitToSI);
fprintf('  cascade loading ratio |Z_in|/Z_canal : min %.2f, median %.2f\n', ...
        min(C.loadingRatio), median(C.loadingRatio));
weak = C.loadingRatio < 3;
if any(weak)
    fprintf(['  NOTE: the no-reverse-loading assumption behind the simple\n' ...
             '        product needs |Z_in| >> Z_canal. That holds over most\n' ...
             '        of the band, but the ratio drops below 3 between\n' ...
             '        %.0f and %.0f Hz (%.0f%% of the band, minimum %.2f at\n' ...
             '        %.0f Hz) -- right at the middle-ear resonance, where\n' ...
             '        the middle ear absorbs most power. Treat the cascade\n' ...
             '        as approximate there. See COMBINEDEARRESPONSE.\n'], ...
        min(f(weak)), max(f(weak)), 100*mean(weak), ...
        min(C.loadingRatio), f(find(C.loadingRatio == min(C.loadingRatio), 1)));
else
    fprintf('  loading ratio stays above 3 everywhere: cascade is safe.\n');
end

end

% -------------------------------------------------------------------------
function fig = newFig(pos)
% White, report-ready figure. Recent MATLAB releases follow a dark desktop
% theme, which would carry into the saved PNG; theme() pins the figure to
% light. The guard keeps the file usable on releases that predate theme().
fig = figure('Position', pos, 'Color', 'w');
if exist('theme', 'file')
    theme(fig, 'light');
end
end
