function Z = Z_ossicles(f, p2)
%Z_OSSICLES  Eardrum + malleus + incus (SERIES element of the ladder).
%
%   Z = Z_OSSICLES(F, P2) returns a complex column vector the same length as
%   F (Hz), in CGS acoustic ohms.
%
%   Elements: C_te  compliance of the coupled drum-malleus-incus block
%             L_te  its inertance (the ossicular mass term)
%             R_te  its damping
%
%   Internal topology:  o--[R_te]--[L_te]--[C_te]--o
%
%   This is the main road: it is the only path by which sound gets from the
%   drum to the stapes, so its impedance is subtracted from the signal as a
%   direct series loss. Below its resonance 1/(2*pi*sqrt(L_te*C_te)) ~ 670 Hz
%   it is stiffness controlled, above it mass controlled, and the mass term
%   is what eventually rolls the middle ear off at high frequency.
%
%   NAMING: the supplied table labels these three elements
%   "eardrum-malleus-incus" and the R_ti/C_ti group "eardrum losses"
%   (source unverified -- see MIDDLEEARPARAMS). The assignment's function
%   list pairs Z_eardrum with "eardrum losses" and Z_ossicles with "eardrum
%   + malleus + incus", which is the mapping used here. Only the names
%   differ -- the circuit is identical either way.
%
%   See also MIDDLEEARPARAMS, MIDDLEEARRESPONSE, Z_EARDRUM.

f  = f(:);
w  = 2*pi*max(f, 1e-9);
jw = 1i*w;

Z = p2.R_te + jw*p2.L_te + 1./(jw*p2.C_te);

end
