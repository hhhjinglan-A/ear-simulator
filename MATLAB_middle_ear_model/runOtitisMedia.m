function T = runOtitisMedia(outDir)
%RUNOTITISMEDIA  Graduate extension: middle-ear effusion in a small child.
%
%   *** EXPLORATORY SIMULATION. *** The parameter DIRECTIONS are supported by
%   clinical literature; every MAGNITUDE is assumed. The clinical figures it
%   is scored against are real and cited, but nothing here is a validated
%   predictor of any patient's hearing. See README section 9.
%
%   T = RUNOTITISMEDIA compares the healthy ear with three severities of
%   otitis media with effusion (OME), prints a comparison against published
%   clinical findings, and saves fig5_otitis_media.png. T is a table of the
%   model's predictions.
%   RUNOTITISMEDIA(OUTDIR) saves the figure into OUTDIR.
%
%   THREE INDEPENDENT CLINICAL SIGNATURES ARE USED AS TESTS. None of them
%   was used to choose the parameters (see MIDDLEEARPARAMS):
%
%     1. Conductive loss. Air-bone gaps in OME run about 10-40 dB, mean
%        ~26 dB; four-frequency averages are ~21.7 dB HL for partial
%        effusions and ~42.8 dB HL for full ones, with a FLAT configuration
%        and normal bone conduction.
%     2. Resonance frequency FALLS. OME, ossicular discontinuity and an
%        atelectatic drum lower the middle-ear resonance frequency;
%        otosclerosis raises it. Normal adult resonance is ~965 Hz
%        (typically 800-1200 Hz).
%     3. Static admittance falls to a type B (flat) tympanogram. The 90%
%        normative range at 226 Hz in children aged 5-7 is 0.2-1.0 mmho;
%        1 mmho == 1e-8 m^3/(Pa*s) == the admittance of 1 cm^3 of air.
%
%   WHY THIS NEEDS THE SERIES CAVITY. The defining change in OME is that the
%   middle-ear air space is replaced by fluid, i.e. C_cp collapses. Under the
%   rejected shunt arrangement a change in C_cp has EXACTLY no effect on the
%   transfer function (experiment E4 measured max|dH| = 0.00000 dB), so the
%   effusion itself would be completely invisible and only the secondary drum
%   changes would register. This function measures that two ways: the
%   CAVITY-ONLY loss (nothing but C_cp/C_cm changed), which is the honest
%   isolation of the effect; and the full variant re-run with
%   p2.cavityPlacement = 'shunt'. Read both -- the cavity term is real but,
%   in this model, not the dominant one.
%
%   See also MIDDLEEARPARAMS, MIDDLEEARRESPONSE, RUNMIDDLEEAREXPERIMENTS.

if nargin < 1, outDir = pwd; end
if ~exist(outDir, 'dir'), mkdir(outDir); end

f   = logspace(log10(20), log10(20000), 8192).';
dbv = @(x) 20*log10(max(abs(x), 1e-12));
sev = {'mild', 'moderate', 'severe'};
fq  = [250 500 1000 2000 4000 8000];
fPTA = [500 1000 2000 4000];              % the clinical four-frequency set
fFlat = linspace(250, 4000, 64);          % band over which flatness is judged

pn = middleEarParams();
Rn = middleEarResponse(pn, f);
gn = dbv(Rn.total);

% Static acoustic admittance at the 226 Hz probe tone, in mmho.
    function y = adm226(R, p)
        y = 1/(interp1(f, abs(R.inputImpedance), 226)*p.Z_unitToSI)/1e-8;
    end

fprintf('\n========= Graduate extension: otitis media with effusion =========\n');
fprintf('healthy reference: peak %+.1f dB at %.0f Hz, resonance %.0f Hz, ', ...
        Rn.peakGainDb, Rn.fPeak, Rn.fResonance);
fprintf('Y(226 Hz) = %.2f mmho\n\n', adm226(Rn, pn));

n = numel(sev);
rows = zeros(n, numel(fq));
pta = zeros(n,1); flat = zeros(n,1); yy = zeros(n,1);
rf = zeros(n,1); shuntPta = zeros(n,1);
cavPta = zeros(n,1); cavPtaShunt = zeros(n,1);
go = cell(n,1);

for k = 1:n
    po = middleEarParams('otitisMedia', sev{k});
    Ro = middleEarResponse(po, f);
    go{k} = dbv(Ro.total);
    loss  = gn - go{k};

    rows(k,:) = interp1(f, loss, fq);
    pta(k)  = mean(interp1(f, loss, fPTA));
    ls      = interp1(f, loss, fFlat);
    flat(k) = max(ls) - min(ls);
    yy(k)   = adm226(Ro, po);
    rf(k)   = Ro.fResonance;

    % The same pathology under the rejected shunt cavity.
    ps = po; ps.cavityPlacement = 'shunt';
    pnS = pn; pnS.cavityPlacement = 'shunt';
    shuntPta(k) = mean(interp1(f, ...
        dbv(middleEarResponse(pnS,f).total) - dbv(middleEarResponse(ps,f).total), fPTA));

    % Cavity-only: the effusion and nothing else. This isolates the term
    % that the shunt arrangement would annihilate.
    pc = pn; pc.C_cp = pn.C_cp*po.ome.airFraction;
             pc.C_cm = pn.C_cm*po.ome.airFraction;
             pc.R_a  = pn.R_a *po.ome.R_a_factor;
    cavPta(k) = mean(interp1(f, gn - dbv(middleEarResponse(pc,f).total), fPTA));
    pcS = pc; pcS.cavityPlacement = 'shunt';
    cavPtaShunt(k) = mean(interp1(f, ...
        dbv(middleEarResponse(pnS,f).total) - dbv(middleEarResponse(pcS,f).total), fPTA));

    fprintf('%-9s  air %5.1f%% of normal | L_te x%.1f  R_te x%.0f  C_te x%.2f  R_a x%.0f\n', ...
            sev{k}, po.ome.airFraction*100, po.ome.L_te_factor, ...
            po.ome.R_te_factor, po.ome.C_te_factor, po.ome.R_a_factor);
    fprintf('           loss at %s Hz = %s dB\n', ...
            strjoin(compose('%g', fq), '/'), ...
            strjoin(compose('%.1f', rows(k,:)), '/'));
    fprintf('           4PTA loss %5.1f dB | flatness %4.1f dB | Y226 %.2f mmho | resonance %4.0f Hz\n\n', ...
            pta(k), flat(k), yy(k), rf(k));
end

T = table(pta, flat, yy, rf, cavPta, shuntPta, ...
    'VariableNames', {'PTA4_loss_dB','flatness_dB','Y226_mmho', ...
                      'resonance_Hz','cavityOnly_dB','shuntCavity_dB'}, ...
    'RowNames', sev);
disp(T);

%% ---- scoring against the three clinical signatures ---------------------
fprintf('--- how the predictions compare with the clinic ---\n');
fprintf('             loss vs 10-40 dB   flat (<10 dB)   Y226 type B (<0.2)   resonance falls\n');
for k = 1:n
    fprintf('%-9s   %-16s  %-14s  %-19s  %s\n', sev{k}, ...
        tick(pta(k) >= 10 && pta(k) <= 40, sprintf('%.1f dB', pta(k))), ...
        tick(flat(k) < 10,                 sprintf('%.1f dB', flat(k))), ...
        tick(yy(k) < 0.2,                  sprintf('%.2f',    yy(k))), ...
        tick(rf(k) < Rn.fResonance,        sprintf('%.0f Hz',  rf(k))));
end
fprintf(['\nRead this table honestly: no single severity satisfies all four\n' ...
         'at once. Mass loading lowers the resonance frequency but has little\n' ...
         'authority over the overall loss; only collapsing the cavity air\n' ...
         'moves the loss into the clinical range, and that same collapse is a\n' ...
         'STIFFENING, which pushes the resonance frequency UP and makes the\n' ...
         'loss low-frequency-dominated instead of flat. See README section 9.\n\n']);

%% ---- why the series cavity is required ---------------------------------
fprintf('--- why this extension needs the series cavity ---\n');
fprintf('%-9s %14s %14s | %14s %14s\n', '', 'cavity only', '(same, shunt)', ...
        'full variant', '(same, shunt)');
for k = 1:n
    fprintf('%-9s %11.1f dB %11.1f dB | %11.1f dB %11.1f dB\n', ...
        sev{k}, cavPta(k), cavPtaShunt(k), pta(k), shuntPta(k));
end
fprintf(['\nThe cavity-only column is the effusion on its own. Under the shunt\n' ...
         'arrangement it is annihilated exactly (0.0 dB, experiment E4): the\n' ...
         'defining feature of the disease would produce literally no change in\n' ...
         'the transfer function, and the extension could not be posed at all.\n' ...
         'The series arrangement is therefore NECESSARY. But read the numbers\n' ...
         'honestly: the cavity term is not the DOMINANT one here -- most of\n' ...
         'the modelled loss comes from the secondary drum changes (L_te, R_te,\n' ...
         'C_te), which survive either way, so the full variant only loses\n' ...
         '2-32%% of its loss under the shunt cavity. That the effusion itself\n' ...
         'carries so little of the loss is one more sign that a lumped air\n' ...
         'compliance is a weak proxy for a fluid-filled middle ear.\n\n']);

%% ---- figure ------------------------------------------------------------
cols = [0.93 0.69 0.13; 0.85 0.33 0.10; 0.64 0.08 0.18];
fig = figure('Position', [100 100 1000 780], 'Color', 'w');
if exist('theme', 'file'), theme(fig, 'light'); end

subplot(2,2,1);
semilogx(f, gn, '-', 'LineWidth', 2.4, 'Color', [0.1 0.1 0.1]); hold on
for k = 1:n
    semilogx(f, go{k}, '-', 'LineWidth', 1.8, 'Color', cols(k,:));
end
grid on; xlim([20 20000]); ylim([-20 32]);
xlabel('Frequency (Hz)'); ylabel('|H_{middle}| (dB)');
title('Middle-ear transmission');
legend([{'healthy'}, sev], 'Location', 'southwest', 'FontSize', 8);

subplot(2,2,2);
fill([250 4000 4000 250], [10 10 40 40], [0.85 0.92 0.85], ...
     'EdgeColor', 'none', 'HandleVisibility', 'off'); hold on
for k = 1:n
    semilogx(f, gn - go{k}, '-', 'LineWidth', 1.8, 'Color', cols(k,:));
end
set(gca, 'XScale', 'log'); grid on; xlim([20 20000]); ylim([-5 45]);
xlabel('Frequency (Hz)'); ylabel('Conductive loss (dB)');
title('Predicted loss vs clinical air-bone gap (10-40 dB)');
legend(sev, 'Location', 'northwest', 'FontSize', 8);

subplot(2,2,3);
loglog(f, abs(Rn.inputImpedance)*pn.Z_unitToSI, '-', ...
       'LineWidth', 2.4, 'Color', [0.1 0.1 0.1]); hold on
for k = 1:n
    po = middleEarParams('otitisMedia', sev{k});
    Ro = middleEarResponse(po, f);
    loglog(f, abs(Ro.inputImpedance)*po.Z_unitToSI, '-', ...
           'LineWidth', 1.8, 'Color', cols(k,:));
end
grid on; xlim([20 20000]);
xlabel('Frequency (Hz)'); ylabel('|Z_{in}| (Pa\cdots/m^3)');
title('Input impedance: the resonance dip fills in');
legend([{'healthy'}, sev], 'Location', 'southwest', 'FontSize', 8);

subplot(2,2,4);
b = bar([adm226(Rn,pn); yy], 'FaceColor', 'flat');
b.CData = [0.1 0.1 0.1; cols];
hold on
yline(1.0, '--', 'child norm upper 1.0', 'Color', [0.2 0.5 0.2], 'FontSize', 8);
yline(0.2, '--', 'child norm lower 0.2', 'Color', [0.7 0.2 0.2], 'FontSize', 8);
set(gca, 'XTickLabel', [{'healthy'}, sev]);
ylim([0 1.15]);          % headroom so both normative lines are visible
ylabel('Y at 226 Hz (mmho)'); grid on;
title('Static admittance vs the 5-7 yr normative range');

sgtitle('Graduate extension: otitis media with effusion in a small child');
saveas(fig, fullfile(outDir, 'fig5_otitis_media.png'));
close(fig);
fprintf('Figure written to %s\n', fullfile(outDir, 'fig5_otitis_media.png'));

end

% -------------------------------------------------------------------------
function s = tick(ok, txt)
if ok, s = sprintf('%s  OK', txt); else, s = sprintf('%s  no', txt); end
end
