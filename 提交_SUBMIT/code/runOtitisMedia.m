function T = runOtitisMedia(outDir)
%RUNOTITISMEDIA  Graduate extension: middle-ear effusion in a small child.
%
%   *** EXPLORATORY SIMULATION, NOT A VALIDATED CLINICAL MODEL. ***
%
%   T = RUNOTITISMEDIA compares four ears -- healthy adult, healthy CHILD,
%   and three severities of otitis media with effusion (OME) in that child --
%   scores them against published clinical findings, and saves
%   fig5_otitis_media.png.
%
%   The child baseline and the effusion are deliberately SEPARATED, because
%   they have different evidence: the child baseline is one assumed volume,
%   the effusion is two assumed physical quantities. Reporting them together
%   would hide which one is doing the work.
%
%   WHAT IS DERIVED AND WHAT IS ASSUMED  (see MIDDLEEARPARAMS for detail):
%
%     DERIVED, via Eq. (2) C = V/(rho_a c^2) -- the same relation that
%     reproduces Pascal's adult values to 1.2 %:
%       C_cp, C_cm from the remaining AIR volume (1-phi)*V_c
%     DERIVED, from a fluid layer of depth t on a drum of area A_t:
%       added inertance rho*t/A_t   (assumes the layer moves with the drum)
%     ASSUMED, no source:
%       V_c for a child (2.8 cm^3); phi; t; and the multipliers on
%       R_te (damping), C_te (drum thickening) and R_a (aditus swelling)
%
%   NOTHING WAS TUNED TO REPRODUCE A TARGET HEARING LOSS. The clinical
%   comparison below is the test of the model, not an input to it -- which
%   is why the model fails parts of it.
%
%   CLINICAL REFERENCE POINTS (sources in README):
%     1. air-bone gap 10-40 dB, mean ~26 dB; 4-frequency average 21.7 dB HL
%        for partial effusion and 42.8 dB HL for full, FLAT in configuration
%     2. OME LOWERS the middle-ear resonance frequency (otosclerosis raises it)
%     3. static admittance falls to type B, below the 0.2-1.0 mmho 90%
%        normative range for children aged 5-7 at a 226 Hz probe tone
%
%   See also MIDDLEEARPARAMS, MIDDLEEARRESPONSE, RUNMIDDLEEAREXPERIMENTS.

if nargin < 1, outDir = pwd; end
if ~exist(outDir, 'dir'), mkdir(outDir); end

f    = logspace(log10(20), log10(20000), 8192).';
dbv  = @(x) 20*log10(max(abs(x), 1e-12));
sev  = {'mild', 'moderate', 'severe'};
fq   = [250 500 1000 2000 4000 8000];
fPTA = [500 1000 2000 4000];
fFlat = linspace(250, 4000, 64);

pA = middleEarParams();            RA = middleEarResponse(pA, f);
pC = middleEarParams('child');     RC = middleEarResponse(pC, f);
gA = dbv(RA.total);  gC = dbv(RC.total);

    function y = adm226(R, p)
        y = 1/(interp1(f, abs(R.inputImpedance), 226)*p.Z_unitToSI)/1e-8;
    end

fprintf('\n===== Graduate extension: otitis media with effusion =====\n');
fprintf('*** EXPLORATORY SIMULATION -- magnitudes are assumed, not sourced ***\n\n');
fprintf('healthy ADULT (Pascal Fig. 1) : peak %+5.1f dB @%4.0f Hz | Y226 %.2f mmho | resonance %4.0f Hz\n', ...
        RA.peakGainDb, RA.fPeak, adm226(RA,pA), RA.fResonance);
fprintf('healthy CHILD (V_c %.1f cm^3) : peak %+5.1f dB @%4.0f Hz | Y226 %.2f mmho | resonance %4.0f Hz\n', ...
        pC.V_c, RC.peakGainDb, RC.fPeak, adm226(RC,pC), RC.fResonance);
fprintf('   child-vs-adult 4PTA difference: %+.1f dB  (anatomy alone, no disease)\n\n', ...
        mean(interp1(f, gA - gC, fPTA)));

n = numel(sev);
rows = zeros(n, numel(fq));
pta = zeros(n,1); flat = zeros(n,1); yy = zeros(n,1); rf = zeros(n,1);
cav = zeros(n,1); shu = zeros(n,1); go = cell(n,1);

for k = 1:n
    po = middleEarParams('otitisMedia', sev{k});
    Ro = middleEarResponse(po, f);
    go{k} = dbv(Ro.total);
    loss  = gC - go{k};                       % relative to the CHILD baseline

    rows(k,:) = interp1(f, loss, fq);
    pta(k) = mean(interp1(f, loss, fPTA));
    ls = interp1(f, loss, fFlat);
    flat(k) = max(ls) - min(ls);
    yy(k) = adm226(Ro, po);
    rf(k) = Ro.fResonance;

    % effusion alone: air volume and aditus only, drum untouched
    pc2 = pC;
    pc2.V_c = pC.V_c*(1-po.ome.fillFraction);
    ct = pc2.V_c/(pc2.rho_a*pc2.c^2);
    pc2.C_cp = ct*3.6/3.95;  pc2.C_cm = ct*0.35/3.95;
    pc2.R_a  = pC.R_a*po.ome.R_a_factor;
    cav(k) = mean(interp1(f, gC - dbv(middleEarResponse(pc2,f).total), fPTA));
    pcs = pc2; pcs.cavityPlacement = 'shunt';
    pCs = pC;  pCs.cavityPlacement = 'shunt';
    shu(k) = mean(interp1(f, dbv(middleEarResponse(pCs,f).total) ...
                           - dbv(middleEarResponse(pcs,f).total), fPTA));

    fprintf('%-9s  phi %.2f (%.0f%% of cleft filled), fluid depth %.1f mm\n', ...
            sev{k}, po.ome.fillFraction, po.ome.fillFraction*100, po.ome.fluidDepth_mm);
    fprintf('           DERIVED: air %.2f cm^3 -> C_cp %.3e F | added mass %.4f H (L_te %.3f -> %.3f)\n', ...
            po.V_c, po.C_cp, po.ome.L_added, pC.L_te, po.L_te);
    fprintf('           ASSUMED: R_te x%g, C_te x%g, R_a x%g\n', ...
            po.ome.R_te_factor, po.ome.C_te_factor, po.ome.R_a_factor);
    fprintf('           loss at %s Hz = %s dB\n', strjoin(compose('%g',fq),'/'), ...
            strjoin(compose('%.1f',rows(k,:)),'/'));
    fprintf('           4PTA %5.1f dB | flatness %4.1f dB | Y226 %.2f mmho | resonance %4.0f Hz\n\n', ...
            pta(k), flat(k), yy(k), rf(k));
end

T = table(pta, flat, yy, rf, cav, shu, 'VariableNames', ...
    {'PTA4_loss_dB','flatness_dB','Y226_mmho','resonance_Hz', ...
     'effusionOnly_dB','effusionOnly_shuntCavity_dB'}, 'RowNames', sev);
disp(T);

%% ---- scoring against the three clinical signatures ---------------------
fprintf('--- scored against the clinic (child baseline resonance %.0f Hz) ---\n', RC.fResonance);
fprintf('             loss 10-40 dB    flat <10 dB    type B <0.2    resonance FALLS\n');
for k = 1:n
    fprintf('%-9s   %-15s %-14s %-14s %s\n', sev{k}, ...
        tick(pta(k)>=10 && pta(k)<=40, sprintf('%.1f dB',pta(k))), ...
        tick(flat(k)<10,              sprintf('%.1f dB',flat(k))), ...
        tick(yy(k)<0.2,               sprintf('%.2f',yy(k))), ...
        tick(rf(k)<RC.fResonance,     sprintf('%.0f Hz',rf(k))));
end

fprintf(['\nHONEST READING. The model reproduces the DIRECTION of the loss and\n' ...
         'its flat configuration, but it does not reproduce the clinical\n' ...
         'MAGNITUDE, and the resonance frequency moves the WRONG WAY.\n' ...
         'The reason is structural, not a bad guess: filling the cleft with\n' ...
         'fluid removes a compliance, which is a STIFFENING, and stiffening\n' ...
         'raises a resonance frequency. Real OME lowers it, because the fluid\n' ...
         'mass-loads the drum more than its loss of air stiffens it. A lumped\n' ...
         'air compliance in series simply cannot express that: once the air is\n' ...
         'gone the drum is loaded by an incompressible liquid coupled to the\n' ...
         'ossicles, which is a mass-and-resistance load, not a small capacitor.\n' ...
         'Getting this right needs a different element, not a different number.\n\n']);

% Why the cavity has so little authority: R_cm sits in PARALLEL across the
% whole cavity block in Fig. 1, so |Z_cavity| can never exceed R_cm however
% small the air volume becomes. Measure it rather than assert it.
fc = logspace(log10(20), log10(20000), 4096).';
pS = middleEarParams('otitisMedia','severe');
zC = max(abs(Z_cavity(fc, pC)));
zS = max(abs(Z_cavity(fc, pS)));
pU = pS; pU.R_cm = 1e12;
zU = max(abs(Z_cavity(fc, pU)));
fprintf(['--- why the effusion has so little authority ---\n' ...
         'R_cm = %g ohm sits in PARALLEL across the cavity block, so it caps\n' ...
         'the block impedance no matter how much air is displaced:\n' ...
         '   healthy child   max|Z_cavity| = %6.1f ohm\n' ...
         '   severe effusion max|Z_cavity| = %6.1f ohm   (air volume down %.0fx)\n' ...
         '   same, with R_cm removed      = %6.0f ohm   (%.0fx larger)\n' ...
         'The circuit is therefore structurally insensitive to cavity volume,\n' ...
         'which is the specific reason this extension under-predicts. That is\n' ...
         'a property of Fig. 1 as drawn, not of the assumed severities.\n\n'], ...
        pC.R_cm, zC, zS, pC.V_c/pS.V_c, zU, zU/zS);

%% ---- why the series cavity is required ---------------------------------
fprintf('--- why the extension needs the series cavity (Fig. 1) ---\n');
for k = 1:n
    fprintf('%-9s  effusion alone: series %5.2f dB  |  shunt %5.2f dB\n', ...
            sev{k}, cav(k), shu(k));
end
fprintf(['Under the rejected shunt placement the effusion -- the defining\n' ...
         'feature of the disease -- produces exactly nothing, so the question\n' ...
         'could not even be posed. Figure 1 draws the cavity in series.\n\n']);

%% ---- figure ------------------------------------------------------------
cols = [0.93 0.69 0.13; 0.85 0.33 0.10; 0.64 0.08 0.18];
fig = figure('Position', [100 100 1000 780], 'Color', 'w');
if exist('theme','file'), theme(fig,'light'); end

subplot(2,2,1);
semilogx(f, gA, '-', 'LineWidth', 1.6, 'Color', [0.5 0.5 0.5]); hold on
semilogx(f, gC, '-', 'LineWidth', 2.4, 'Color', [0.1 0.1 0.1]);
for k = 1:n, semilogx(f, go{k}, '-', 'LineWidth', 1.8, 'Color', cols(k,:)); end
grid on; xlim([20 20000]); ylim([-25 30]);
xlabel('Frequency (Hz)'); ylabel('|H_{middle}| (dB)');
title('Middle-ear transmission');
legend([{'healthy adult','healthy child'}, sev], 'Location','southwest','FontSize',8);

subplot(2,2,2);
fill([250 4000 4000 250],[10 10 40 40],[0.85 0.92 0.85],'EdgeColor','none', ...
     'HandleVisibility','off'); hold on
for k = 1:n, semilogx(f, gC-go{k}, '-', 'LineWidth', 1.8, 'Color', cols(k,:)); end
set(gca,'XScale','log'); grid on; xlim([20 20000]); ylim([-5 45]);
xlabel('Frequency (Hz)'); ylabel('Conductive loss vs healthy child (dB)');
title('Predicted loss vs clinical air-bone gap');
legend(sev,'Location','northwest','FontSize',8);

subplot(2,2,3);
loglog(f, abs(RC.inputImpedance)*pC.Z_unitToSI,'-','LineWidth',2.4,'Color',[0.1 0.1 0.1]); hold on
for k = 1:n
    po = middleEarParams('otitisMedia', sev{k});
    Ro = middleEarResponse(po, f);
    loglog(f, abs(Ro.inputImpedance)*po.Z_unitToSI,'-','LineWidth',1.8,'Color',cols(k,:));
end
grid on; xlim([20 20000]);
xlabel('Frequency (Hz)'); ylabel('|z_t| (Pa\cdots/m^3)');
title('Input impedance');
legend([{'healthy child'}, sev],'Location','southwest','FontSize',8);

subplot(2,2,4);
b = bar([adm226(RC,pC); yy],'FaceColor','flat'); b.CData = [0.1 0.1 0.1; cols];
hold on
yline(1.0,'--','norm upper 1.0','Color',[0.2 0.5 0.2],'FontSize',8);
yline(0.2,'--','norm lower 0.2','Color',[0.7 0.2 0.2],'FontSize',8);
set(gca,'XTickLabel',[{'child'}, sev]); ylim([0 1.15]);
ylabel('Y at 226 Hz (mmho)'); grid on;
title('Static admittance vs 5-7 yr norm');

sgtitle('Otitis media with effusion in a small child (EXPLORATORY)');
saveas(fig, fullfile(outDir,'fig5_otitis_media.png'));
close(fig);
fprintf('Figure written to %s\n', fullfile(outDir,'fig5_otitis_media.png'));

end

% -------------------------------------------------------------------------
function s = tick(ok, txt)
if ok, s = sprintf('%s OK', txt); else, s = sprintf('%s no', txt); end
end
