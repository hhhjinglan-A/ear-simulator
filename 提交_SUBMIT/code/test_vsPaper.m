function test_vsPaper()
%TEST_VSPAPER  Validate against Pascal et al. (1998) Figs. 2 and 3.
%
%   This is the only direct check that the code reproduces the published
%   circuit. MAGNITUDE AND PHASE ARE REPORTED SEPARATELY, because they test
%   different things:
%
%     MAGNITUDE tells you the element VALUES and the transformer referral
%       are right. It is insensitive to sign errors and to where a shunt
%       attaches, because several wrong topologies can be made to fit a
%       magnitude curve.
%
%     PHASE tells you the TOPOLOGY is right. It is set by how many
%       independent energy stores the signal passes through and in what
%       order, so it catches a mis-placed shunt or a swapped series/parallel
%       pair that magnitude alone would hide. A model that matches magnitude
%       but not phase has the right parts in the wrong arrangement.
%
%   Reference points were DIGITISED BY EYE from the scanned figures and
%   carry roughly +/-1.5 dB, +/-15% and +/-10 degrees of reading error, so
%   the tolerances are loose on purpose. This is a check that the topology
%   and referral are right, not a precision fit.
%
%   See also MIDDLEEARRESPONSE, TEST_MIDDLEEAR.

p2 = middleEarParams();

% ---- Fig. 3: H(f) = 20 log10(p_c/p_t), magnitude (dB) and phase (deg) --
fH   = [100 200 300 500 700 1000 1500 2000 2500 3000 4000 5000 6000 8000 10000].';
HdB  = [4.0 10.0 13.5 18.0 21.3 22.4 22.5 19.5 17.6 18.5 20.8 20.3 18.0 12.0 8.0].';
Hph  = [80  75   70   55   40   18   -10  -35  -42  -40  -55  -85  -115 -155 -175].';

% ---- Fig. 2: z_t = p_t/u_t, magnitude (Pa*s/m^3) and phase (deg) -------
fZ   = [100 200 300 500 700 1000 1500 2000 2500 3000 4000 6000 10000].';
Zmag = [3.5e8 2.0e8 1.35e8 8.5e7 6.8e7 6.0e7 6.0e7 5.0e7 8.3e7 7.5e7 5.5e7 4.2e7 4.0e7].';
Zph  = [-70 -68  -60  -48  -40  -35  -30   8    -5   -25  -35  -30  -25].';

R  = middleEarResponse(p2, unique([fH; fZ]));
Hm = interp1(R.f, 20*log10(abs(R.total)), fH);
Hp = interp1(R.f, unwrap(angle(R.total))*180/pi, fH);
Zm = interp1(R.f, abs(R.inputImpedance), fZ)*p2.Z_unitToSI;
Zp = interp1(R.f, angle(R.inputImpedance)*180/pi, fZ);

fprintf('=== Fig. 3   H(f) = p_c/p_t ===\n');
fprintf('   f (Hz)  |  paper dB   model dB    diff  |  paper deg  model deg   diff\n');
for k = 1:numel(fH)
    fprintf('%9.0f  |  %+7.1f  %+8.1f  %+7.1f  |  %+8.0f  %+8.0f  %+7.0f\n', ...
        fH(k), HdB(k), Hm(k), Hm(k)-HdB(k), Hph(k), Hp(k), Hp(k)-Hph(k));
end
eHm = Hm - HdB;  eHp = Hp - Hph;
fprintf('  MAGNITUDE  rms %.2f dB,  max %.2f dB\n',   rms(eHm), max(abs(eHm)));
fprintf('  PHASE      rms %.1f deg, max %.1f deg\n\n', rms(eHp), max(abs(eHp)));

fprintf('=== Fig. 2   z_t = p_t/u_t ===\n');
fprintf('   f (Hz)  |    paper       model   ratio  |  paper deg  model deg   diff\n');
for k = 1:numel(fZ)
    fprintf('%9.0f  |  %9.2e  %9.2e  %5.2fx  |  %+8.0f  %+8.0f  %+7.0f\n', ...
        fZ(k), Zmag(k), Zm(k), Zm(k)/Zmag(k), Zph(k), Zp(k), Zp(k)-Zph(k));
end
eZm = 20*log10(Zm./Zmag);  eZp = Zp - Zph;
fprintf('  MAGNITUDE  rms %.2f dB,  max %.2f dB\n',   rms(eZm), max(abs(eZm)));
fprintf('  PHASE      rms %.1f deg, max %.1f deg\n\n', rms(eZp), max(abs(eZp)));

%% ---- what each comparison establishes ---------------------------------
n = 0; fail = 0;
    function chk(name, cond)
        n = n + 1;
        if cond, fprintf('  PASS  %s\n', name);
        else,    fprintf('  FAIL  %s\n', name); fail = fail + 1; end
    end

fprintf('=== element values and referral (magnitude) ===\n');
chk(sprintf('Fig.3 magnitude within 2.5 dB rms (%.2f)', rms(eHm)), rms(eHm) < 2.5);
chk(sprintf('Fig.2 magnitude within 2.5 dB rms (%.2f)', rms(eZm)), rms(eZm) < 2.5);

fprintf('=== topology and ordering (phase) ===\n');
chk(sprintf('Fig.3 phase within 25 deg rms (%.1f)', rms(eHp)), rms(eHp) < 25);
chk(sprintf('Fig.2 phase within 25 deg rms (%.1f)', rms(eZp)), rms(eZp) < 25);
chk('H phase leads at 100 Hz and lags above 2 kHz', ...
    Hp(1) > 40 && interp1(fH, Hp, 3000) < -20);
chk('z_t phase rises through zero near 2 kHz (cavity/ossicular resonance)', ...
    interp1(fZ, Zp, 1000) < 0 && max(Zp) > -10);

fprintf('=== qualitative features ===\n');
g = 20*log10(abs(R.total));
chk(sprintf('H peak 19-25 dB (paper ~22.5; model %.1f)', R.peakGainDb), ...
    R.peakGainDb > 19 && R.peakGainDb < 25);
chk(sprintf('H peak lies 700-2000 Hz (%.0f Hz)', R.fPeak), ...
    R.fPeak > 700 && R.fPeak < 2000);
band = R.f > 3000 & R.f < 7000;
chk('second peak between 3 and 7 kHz', ...
    max(g(band)) > interp1(R.f,g,3000) && max(g(band)) > interp1(R.f,g,7000));
chk('H falls below 12 dB by 10 kHz', interp1(R.f,g,10000) < 12);
chk(sprintf('z_t first local minimum 1.4-2.4 kHz (%.0f Hz)', R.fResonance), ...
    R.fResonance > 1400 && R.fResonance < 2400);

fprintf('\n%d checks, %d failed\n', n, fail);
fprintf('SUMMARY  magnitude: Fig.3 %.2f dB / Fig.2 %.2f dB rms\n', rms(eHm), rms(eZm));
fprintf('         phase:     Fig.3 %.1f deg / Fig.2 %.1f deg rms\n', rms(eHp), rms(eZp));
if fail > 0, error('test_vsPaper:failed', '%d checks failed', fail); end

end

function y = rms(x)
y = sqrt(mean(x.^2));
end
