function test_audioIR()
%TEST_AUDIOIR  Verify the audio path reproduces the analytic transfer function.
%
%   TEST_AUDIOIR checks COMBINEDEARIR the way it is actually used, by
%   comparing FREQUENCY RESPONSES rather than impulse peaks. Two tests:
%
%     A. spectrum of the impulse response  vs  COMBINEDEARRESPONSE
%        The IR is time-centred by a circshift of N/2, so that linear phase
%        term is removed before comparing. Tests magnitude AND phase.
%
%     B. end-to-end: white noise convolved with the IR and truncated exactly
%        as PLAYAUDIO does, then the transfer function is re-estimated from
%        the input and output spectra. This validates the playback chain,
%        not just the filter design.
%
%        NOTE on reading B: its ~0.6 dB rms residual is dominated by the bias
%        of the block-averaged spectral ESTIMATOR (finite blocks, Hann
%        windowing, edge effects), which is almost identical for every
%        condition -- so the four rows print nearly the same number. That
%        residual is a property of the measurement, not of the filter; test A
%        (0.005 dB rms) is the real filter-accuracy figure. To remove the
%        common-mode bias, B also does a DIFFERENTIAL check: the healthy-minus-
%        diseased response measured through the chain must match the model's
%        own difference, and there the estimator bias cancels.
%
%   The Hann window applied in COMBINEDEARIR smooths the response, so exact
%   agreement is not expected; the tolerances below are what that windowing
%   actually costs, measured over 20 Hz - 20 kHz.
%
%   See also COMBINEDEARIR, COMBINEDEARMODEL, TEST_MIDDLEEAR.

fs = 44100;
N  = 4096;
p1 = outerEarParams();
p2 = middleEarParams();

n = 0; fail = 0;
    function chk(name, cond)
        n = n + 1;
        if cond, fprintf('  PASS  %s\n', name);
        else,    fprintf('  FAIL  %s\n', name); fail = fail + 1; end
    end

conds = {'normal', 'mild', 'moderate', 'severe'};

fprintf('--- A. impulse-response spectrum vs analytic transfer function ---\n');
for c = 1:numel(conds)
    q  = applyCond(p2, conds{c});
    ir = combinedEarIR(p1, q, fs, N);

    nf = N/2 + 1;
    f  = (0:nf-1).'*(fs/N);
    Cq = combinedEarResponse(p1, q, f);
    Ha = Cq.total;

    Hm = fft(ir);
    Hm = Hm(1:nf);
    % undo the N/2-sample centring shift, which is pure linear phase
    Hm = Hm .* exp(1i*2*pi*(0:nf-1).'*(N/2)/N);

    band = f >= 20 & f <= 20000;
    magErr = 20*log10(abs(Hm(band))) - 20*log10(abs(Ha(band)));
    phErr  = angle(Hm(band)./Ha(band))*180/pi;

    fprintf('  %-9s magnitude err: rms %.3f dB, max %.3f dB | phase err: rms %.2f deg, max %.2f deg\n', ...
        conds{c}, rms(magErr), max(abs(magErr)), rms(phErr), max(abs(phErr)));
    chk(sprintf('%s: IR magnitude within 1.0 dB rms of analytic', conds{c}), ...
        rms(magErr) < 1.0);
    chk(sprintf('%s: IR phase within 10 deg rms of analytic', conds{c}), ...
        rms(phErr) < 10);
    chk(sprintf('%s: IR is real and finite', conds{c}), ...
        isreal(ir) && all(isfinite(ir)));
end

fprintf('\n--- B. end-to-end playback chain (noise -> conv -> truncate) ---\n');
rng(0);
L  = 16*fs;                       % long enough for a stable estimate
x  = randn(L, 1);
estDb = cell(1,numel(conds)); anaDb = cell(1,numel(conds));
feKeep = []; bandKeep = [];
for c = 1:numel(conds)
    q  = applyCond(p2, conds{c});
    ir = combinedEarIR(p1, q, fs, N);

    y = conv(x, ir);
    y = y(1:numel(x));            % exactly what playAudio does

    % Estimate |H| by averaging periodograms over blocks, base MATLAB only.
    nb = 32; Lb = floor(L/nb);
    Sxy = zeros(Lb,1); Sxx = zeros(Lb,1);
    w = 0.5 - 0.5*cos(2*pi*(0:Lb-1).'/(Lb-1));
    for b = 1:nb
        idx = (b-1)*Lb + (1:Lb);
        X = fft(x(idx).*w);  Y = fft(y(idx).*w);
        Sxy = Sxy + Y.*conj(X);
        Sxx = Sxx + X.*conj(X);
    end
    Hest = Sxy./Sxx;

    nf2 = floor(Lb/2);
    fe  = (0:nf2-1).'*(fs/Lb);
    Cq2 = combinedEarResponse(p1, q, fe);
    Ha2 = Cq2.total;

    band = fe >= 20 & fe <= 20000;
    err  = 20*log10(abs(Hest(1:nf2))) - 20*log10(abs(Ha2));
    err  = err(band);

    fprintf(['  %-9s measured-vs-analytic: rms %.3f dB, max %.3f dB' ...
             ' | gain at 1 kHz: measured %+7.2f dB, analytic %+7.2f dB\n'], ...
        conds{c}, rms(err), max(abs(err)), ...
        interp1(fe, 20*log10(abs(Hest(1:nf2))), 1000), ...
        interp1(fe, 20*log10(abs(Ha2)), 1000));
    chk(sprintf('%s: played-back response within 1.5 dB rms', conds{c}), ...
        rms(err) < 1.5);
    estDb{c} = 20*log10(abs(Hest(1:nf2)));
    anaDb{c} = 20*log10(abs(Ha2));
    feKeep   = fe;
    bandKeep = band;
end

% Differential check: the estimator bias is common to every condition, so
% comparing DIFFERENCES cancels it and leaves a far sharper test of the chain.
fprintf('\n  differential (bias cancels):\n');
for c = 2:numel(conds)
    dMeas = estDb{1}(bandKeep) - estDb{c}(bandKeep);
    dAna  = anaDb{1}(bandKeep) - anaDb{c}(bandKeep);
    fprintf('    normal - %-9s : rms %.4f dB, max %.4f dB\n', ...
            conds{c}, rms(dMeas-dAna), max(abs(dMeas-dAna)));
    chk(sprintf('normal-vs-%s difference within 0.25 dB rms', conds{c}), ...
        rms(dMeas-dAna) < 0.25);
end
% The chain must resolve the difference between conditions, and resolve it
% by the amount the model predicts (not by some fixed number of dB, which
% would silently encode whatever the current OME severities happen to give).
measDiff = interp1(feKeep, estDb{1}, 1000) - interp1(feKeep, estDb{4}, 1000);
anaDiff  = interp1(feKeep, anaDb{1}, 1000) - interp1(feKeep, anaDb{4}, 1000);
fprintf('    normal-vs-severe at 1 kHz: chain %.2f dB, model %.2f dB\n', ...
        measDiff, anaDiff);
chk('chain resolves normal vs severe to within 0.3 dB of the model', ...
    abs(measDiff - anaDiff) < 0.3 && abs(anaDiff) > 3);

fprintf('\n--- C. the audio path hears the disease ---\n');
% The whole point of the audition: the 4PTA loss measured THROUGH the audio
% chain must match the loss predicted by the frequency-domain model.
fPTA = [500 1000 2000 4000];
irN = combinedEarIR(p1, applyCond(p2,'normal'),   fs, N);
nf  = N/2 + 1;  f = (0:nf-1).'*(fs/N);
HN  = fft(irN); HN = HN(1:nf);
for c = 2:numel(conds)
    irO = combinedEarIR(p1, applyCond(p2, conds{c}), fs, N);
    HO  = fft(irO); HO = HO(1:nf);
    lossAudio = mean(interp1(f, 20*log10(abs(HN)./abs(HO)), fPTA));

    Cn = combinedEarResponse(p1, applyCond(p2,'normal'),   f);
    Co = combinedEarResponse(p1, applyCond(p2, conds{c}), f);
    lossModel = mean(interp1(f, 20*log10(abs(Cn.total)./abs(Co.total)), fPTA));

    fprintf('  %-9s 4PTA loss: audio chain %5.2f dB | model %5.2f dB | diff %.3f dB\n', ...
        conds{c}, lossAudio, lossModel, abs(lossAudio-lossModel));
    chk(sprintf('%s: audio 4PTA loss matches model within 0.5 dB', conds{c}), ...
        abs(lossAudio - lossModel) < 0.5);
end

fprintf('\n%d checks, %d failed\n', n, fail);
if fail > 0, error('test_audioIR:failed', '%d checks failed', fail); end

end

% -------------------------------------------------------------------------
function q = applyCond(base, cond)
% Same pathology application COMBINEDEARMODEL uses.
q = base;
if strcmp(cond, 'normal'), return; end
po = middleEarParams('otitisMedia', cond);
q.C_cp = q.C_cp*po.ome.airFraction;
q.C_cm = q.C_cm*po.ome.airFraction;
q.R_a  = q.R_a *po.ome.R_a_factor;
q.L_te = q.L_te*po.ome.L_te_factor;
q.R_te = q.R_te*po.ome.R_te_factor;
q.C_te = q.C_te*po.ome.C_te_factor;
end

function y = rms(x)
y = sqrt(mean(x.^2));
end
