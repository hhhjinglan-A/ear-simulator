function R = outerEarResponse(p, f)
%OUTEREARRESPONSE  Physics-based transfer function of the outer ear.
%
%   R = OUTEREARRESPONSE(P, F) evaluates the four outer-ear mechanisms at the
%   frequencies F (Hz) for the parameter struct P (see OUTEREARPARAMS) and
%   returns a struct R with the complex pressure transfer functions
%
%       R.reflector  concha acting as a parabolic reflector
%       R.concha     concha cavity Helmholtz resonance
%       R.canal      ear-canal resonance (quarter-wave OR IEC 318 circuit)
%       R.pinna      pinna reflection comb filter (direction dependent)
%       R.total      product of all four
%
%   and the characteristic frequencies
%
%       R.fHelmholtz     concha Helmholtz resonance (Hz)
%       R.fCanal         first three ear-canal resonances (Hz)
%       R.fNotch         first three pinna reflection notches (Hz)
%       R.pathDiff       pinna reflection path difference (m)
%       R.tau            pinna reflection delay (s)
%
%   F may contain 0 Hz; the singular terms are guarded.
%
%   See also OUTEREARPARAMS, OUTEREARMODEL.

f  = f(:);
c  = p.c;
fs = max(f, 1e-9);        % guard against division by zero at DC
w  = 2*pi*fs;

%% ---- 1. Concha as a parabolic reflector --------------------------------
% A reflector only produces useful gain once its aperture is comparable to
% the wavelength. Using ka = 2*pi*f*a/c as the size parameter, the gain rises
% from 0 dB (ka << 1, wave diffracts around the reflector) to an asymptotic
% maximum (ka >> 1, specular reflection into the canal).
aRef  = p.reflectorDiameter/2;
ka    = w*aRef/c;
gaindB = p.reflectorGainMax .* (ka.^2)./(1 + ka.^2);
R.reflector = 10.^(gaindB/20);

%% ---- 2. Concha cavity: Helmholtz resonance -----------------------------
% f_H = (c/2*pi) * sqrt(A / (V * Leff)),  Leff = neck + end correction.
aAp  = p.conchaAperture/2;
Aap  = pi*aAp^2;                 % aperture area
Leff = p.conchaDepth + 1.7*aAp;  % 0.85*a end correction at each end
fH   = (c/(2*pi))*sqrt(Aap/(p.conchaVolume*Leff));

% The cavity resonance is superimposed on the direct path into the canal:
% it adds a resonant BOOST near f_H and returns to unity gain well above and
% below it. Modelling it as a plain second-order low-pass instead would roll
% the whole response off at 12 dB/octave above f_H, which is not what the
% concha does -- sound still reaches the canal by the direct path.
%
%   bandpass term: unity at f_H, -> 0 at DC and at high frequency
%   H = 1 + (A-1)*bandpass   ->  |H| = A exactly at f_H, 1 far away
r  = f./fH;
bp = (1i*r/p.conchaQ)./(1 - r.^2 + 1i*r/p.conchaQ);
A  = 10^(p.conchaGainDb/20);
R.concha = 1 + (A - 1)*bp;
R.fHelmholtz = fH;

%% ---- 3. Ear canal ------------------------------------------------------
switch lower(p.canalModel)

    case 'quarterwave'
        % Tube open at the concha, closed by the eardrum. Pressure gain at
        % the closed end is 1/cos(k*L). A complex wavenumber supplies the
        % losses that keep the resonance peaks finite.
        aC   = p.canalDiameter/2;
        Lc   = p.canalLength + 0.85*aC;      % unflanged open-end correction
        k    = (w/c).*(1 - 1i/(2*p.canalQ));
        R.canal = 1./cos(k*Lc);
        R.fCanal = (2*(1:3)-1)*c/(4*Lc);

    case 'iec318'
        % IEC 318 lumped equivalent circuit (course slide 26).
        % L3 is the air mass in the canal   -> L = rho*l/A  ->  scales as l/A
        % C1 is the canal compliance        -> C = V/(rho*c^2) -> scales as A*l
        A0 = pi*(p.canalDiameter0/2)^2;
        A  = pi*(p.canalDiameter/2)^2;
        sL = (p.canalLength/p.canalLength0)*(A0/A);
        sC = (A*p.canalLength)/(A0*p.canalLength0);
        L3 = p.L3*sL;
        C1 = p.C1*sC;

        jw = 1i*w;
        Zb2 = 1./(jw*p.C2) + jw*p.L1 + p.R2;   % eardrum resonance branch 1
        Zb3 = 1./(jw*p.C3) + jw*p.L2 + p.R3;   % eardrum resonance branch 2
        Y   = 1/p.R1 + jw*C1 + 1./Zb2 + 1./Zb3;
        Zld = 1./Y;
        R.canal  = Zld./(Zld + jw*L3);
        R.fCanal = 1/(2*pi*sqrt(L3*C1));

    otherwise
        error('outerEarResponse:badModel', ...
              'p.canalModel must be ''quarterwave'' or ''iec318''.');
end

%% ---- 4. Pinna reflections ---------------------------------------------
% A single delayed reflection off the pinna adds to the direct sound and
% produces a comb filter. The extra path length depends on where the source
% is: sound arriving along the reflector axis travels the longest extra
% path, sound from behind the reflector the shortest.
az = deg2rad(p.azimuth);
el = deg2rad(p.elevation);
sVec = [cos(el)*cos(az); cos(el)*sin(az); sin(el)];   % source direction
n    = p.pinnaNormal(:)/norm(p.pinnaNormal);          % reflector axis
cosPsi = dot(sVec, n);

delta = p.pinnaPathBase*(1 + cosPsi);   % extra path length (m)
tau   = delta/c;                        % reflection delay (s)

% The pinna features can only reflect wavelengths comparable to or shorter
% than themselves; at low frequency the sound simply diffracts around them.
% Without this the comb filter would add a spurious constructive gain all
% the way down to DC, where a 10 mm feature cannot possibly reflect a 17 m
% wavelength.
kap   = w*p.pinnaPathBase/c;
rhoEff = p.pinnaStrength*(kap.^2)./(1 + kap.^2);

R.pinna    = 1 + rhoEff.*exp(-1i*w*tau);
R.rhoEff   = rhoEff;
R.pathDiff = delta;
R.tau      = tau;

% Notch frequencies: destructive interference.
%   rho > 0  ->  notches where w*tau = pi, 3pi, 5pi   -> f = (2n-1)/(2*tau)
%   rho < 0  ->  notches where w*tau = 0, 2pi, 4pi    -> f = n/tau
if tau > 0
    if p.pinnaStrength >= 0
        R.fNotch = (2*(1:3)-1)/(2*tau);
    else
        R.fNotch = (1:3)/tau;
    end
else
    R.fNotch = [];
end

%% ---- combined ----------------------------------------------------------
R.total = R.reflector .* R.concha .* R.canal .* R.pinna;
R.f     = f;

end
