function combinedEarModel()
%COMBINEDEARMODEL  Interactive model of the outer ear cascaded with the middle ear.
%
%   COMBINEDEARMODEL opens a GUI that predicts how outer-ear anatomy and
%   middle-ear mechanics together shape the sound reaching the cochlea. It
%   extends OUTEREARMODEL from the previous assignment with the middle-ear
%   ladder network of MIDDLEEARPARAMS (element provenance unverified -- see
%   that file), and shows
%
%     1. the outer ear alone      P_eardrum   / P_free field   (dashed)
%     2. the middle ear alone     P_vestibule / P_eardrum       (dashed)
%     3. the cascaded product     H_outer * H_middle            (thick)
%
%   Every anatomical parameter is on a live slider, the four dominant
%   middle-ear circuit elements have sliders of their own, a sweep tool
%   overlays a family of curves for any single parameter, a condition menu
%   switches between a healthy ear and three severities of otitis media with
%   effusion, and the modelled response can be auditioned on noise, a chirp,
%   or your own audio file.
%
%   The computation is not duplicated here: this file is a front end for
%   OUTEREARRESPONSE, MIDDLEEARRESPONSE, COMBINEDEARRESPONSE,
%   MIDDLEEARPARAMS and COMBINEDEARIR.
%
%   Requires base MATLAB only (no Signal Processing or Audio Toolbox).
%
%   See also OUTEREARMODEL, COMBINEDEARRESPONSE, MIDDLEEARPARAMS, RUNALL.

p1       = outerEarParams();     % outer-ear anatomy
p2       = middleEarParams();    % middle-ear circuit, HEALTHY baseline
condition = 'normal';            % 'normal' | 'mild' | 'moderate' | 'severe'

fPlot    = logspace(log10(20), log10(20000), 1024).';
fs       = 44100;      % audio sample rate
irLen    = 4096;       % impulse-response length for auditioning
player   = [];         % audioplayer handle
userAudio = [];        % audio loaded from disk

h = struct();          % handles
sl = struct();         % slider handles, keyed by parameter name
lb = struct();         % slider label handles

% name, label, min, max, display scale, unit, format, which struct it lives in
specs = {
 'canalLength'       , 'Canal length'      , 0.015 , 0.035 , 1000  , 'mm' , '%.1f' , 'outer'
 'canalDiameter'     , 'Canal diameter'    , 0.004 , 0.012 , 1000  , 'mm' , '%.1f' , 'outer'
 'canalQ'            , 'Canal Q (damping)' , 1     , 30    , 1     , ''   , '%.1f' , 'outer'
 'conchaVolume'      , 'Concha volume'     , 1e-6  , 1e-5  , 1e6   , 'cm^3','%.2f' , 'outer'
 'conchaDepth'       , 'Concha depth'      , 0.004 , 0.020 , 1000  , 'mm' , '%.1f' , 'outer'
 'conchaAperture'    , 'Concha aperture'   , 0.008 , 0.025 , 1000  , 'mm' , '%.1f' , 'outer'
 'conchaQ'           , 'Concha Q'          , 0.5   , 10    , 1     , ''   , '%.2f' , 'outer'
 'conchaGainDb'      , 'Concha peak gain'  , 0     , 18    , 1     , 'dB' , '%.1f' , 'outer'
 'reflectorDiameter' , 'Reflector diameter', 0.010 , 0.045 , 1000  , 'mm' , '%.1f' , 'outer'
 'reflectorGainMax'  , 'Reflector max gain', 0     , 15    , 1     , 'dB' , '%.1f' , 'outer'
 'pinnaPathBase'     , 'Reflection path'   , 0.002 , 0.025 , 1000  , 'mm' , '%.1f' , 'outer'
 'pinnaStrength'     , 'Reflection strength',-1    , 1     , 1     , ''   , '%.2f' , 'outer'
 'azimuth'           , 'Source azimuth'    , -180  , 180   , 1     , 'deg', '%.0f' , 'outer'
 'elevation'         , 'Source elevation'  , -60   , 90    , 1     , 'deg', '%.0f' , 'outer'
 % Middle-ear circuit elements. Ranges are 0.5x to 2x the MIDDLEEARPARAMS
 % default, i.e. -50% / +100% around the supplied table value.
 'L_te'              , 'Ossicular mass'    , 20e-3 , 80e-3 , 1e3   , 'mH' , '%.1f' , 'middle'
 'C_is'              , 'Joint compliance'  , 0.015e-6, 0.06e-6, 1e6 , 'uF' , '%.3f' , 'middle'
 'R_te'              , 'Eardrum resistance', 32.5  , 130   , 1     , 'ohm', '%.0f' , 'middle'
 'C_cp'              , 'Cavity compliance' , 1.8e-6, 7.2e-6, 1e6   , 'uF' , '%.2f' , 'middle'
};
nOuter = 14;

conditions = {'normal', 'mild', 'moderate', 'severe'};
condLabels = {'Normal ear', 'Mild OME', 'Moderate OME', 'Severe OME'};

buildUI();
refresh();

%% ======================================================================
    function buildUI()
        h.fig = uifigure('Name', 'Outer + Middle Ear Model - interactive', ...
            'Position', [60 40 1480 920], 'Color', [1 1 1]);

        outer = uigridlayout(h.fig, [1 2]);
        outer.ColumnWidth = {360, '1x'};
        outer.RowHeight   = {'1x'};
        outer.Padding     = [8 8 8 8];
        outer.ColumnSpacing = 8;

        % ---------------- control column --------------------------------
        ctrlPanel = uipanel(outer, 'Title', 'Anatomical and circuit parameters', ...
            'Scrollable', 'on', 'FontWeight', 'bold');

        nRows = size(specs,1);
        g = uigridlayout(ctrlPanel, [nRows+12 1]);
        g.RowHeight = [{22}, num2cell(repmat(46, 1, nOuter)), ...
                       {22}, num2cell(repmat(46, 1, nRows-nOuter)), ...
                       {24, 32, 24, 32, 24, 32, 32, 32, 32, 32}];
        g.ColumnWidth = {'1x'};
        g.Padding = [8 8 8 8];
        g.RowSpacing = 4;

        r = 1;
        hd1 = uilabel(g, 'Text', 'OUTER EAR', 'FontWeight', 'bold', ...
                      'FontColor', [0 0.45 0.74]);
        hd1.Layout.Row = r;

        for k = 1:nRows
            if k == nOuter + 1
                r = r + 1;
                hd2 = uilabel(g, 'Text', 'MIDDLE EAR (source unverified)', ...
                    'FontWeight', 'bold', 'FontColor', [0.64 0.08 0.18]);
                hd2.Layout.Row = r;
            end
            r = r + 1;
            name = specs{k,1};
            row = uigridlayout(g, [2 1]);
            row.RowHeight = {18, 20};
            row.Padding = [0 0 0 0];
            row.RowSpacing = 2;
            row.Layout.Row = r;

            lb.(name) = uilabel(row, 'FontSize', 11);
            s = uislider(row, ...
                'Limits', [specs{k,3} specs{k,4}], ...
                'Value',  getParam(name), ...
                'MajorTicks', [], 'MinorTicks', []);
            s.ValueChangingFcn = @(src,ev) onSlider(name, ev.Value);
            s.ValueChangedFcn  = @(src,ev) onSlider(name, src.Value);
            sl.(name) = s;
        end

        r = r + 1;
        t1 = uilabel(g, 'Text', 'Ear-canal model', 'FontWeight', 'bold');
        t1.Layout.Row = r;
        r = r + 1;
        h.canalModel = uidropdown(g, ...
            'Items', {'Quarter-wave tube', 'IEC 318 equivalent circuit'}, ...
            'ItemsData', {'quarterwave', 'iec318'}, ...
            'Value', p1.canalModel, ...
            'ValueChangedFcn', @(src,~) onCanalModel(src.Value));
        h.canalModel.Layout.Row = r;

        r = r + 1;
        t2 = uilabel(g, 'Text', 'Middle-ear condition', 'FontWeight', 'bold');
        t2.Layout.Row = r;
        r = r + 1;
        h.condition = uidropdown(g, ...
            'Items', condLabels, 'ItemsData', conditions, ...
            'Value', condition, ...
            'ValueChangedFcn', @(src,~) onCondition(src.Value));
        h.condition.Layout.Row = r;

        r = r + 1;
        t3 = uilabel(g, 'Text', 'Parameter sweep', 'FontWeight', 'bold');
        t3.Layout.Row = r;
        r = r + 1;
        h.sweepParam = uidropdown(g, ...
            'Items', specs(:,2)', 'ItemsData', specs(:,1)', ...
            'Value', 'canalLength');
        h.sweepParam.Layout.Row = r;

        r = r + 1;
        sweepRow = uigridlayout(g, [1 2]);
        sweepRow.Padding = [0 0 0 0];
        sweepRow.ColumnSpacing = 6;
        sweepRow.Layout.Row = r;
        uibutton(sweepRow, 'Text', 'Run sweep', ...
            'ButtonPushedFcn', @(~,~) runSweep());
        uibutton(sweepRow, 'Text', 'Clear', ...
            'ButtonPushedFcn', @(~,~) clearSweep());

        r = r + 1;
        bReset = uibutton(g, 'Text', 'Reset to defaults', ...
            'ButtonPushedFcn', @(~,~) resetAll());
        bReset.Layout.Row = r;

        r = r + 1;
        bExport = uibutton(g, 'Text', 'Export response to CSV', ...
            'ButtonPushedFcn', @(~,~) exportCSV());
        bExport.Layout.Row = r;

        r = r + 1;
        bPng = uibutton(g, 'Text', 'Export plot to PNG', ...
            'ButtonPushedFcn', @(~,~) exportPNG());
        bPng.Layout.Row = r;

        % ---------------- plot column -----------------------------------
        right = uigridlayout(outer, [2 1]);
        right.RowHeight = {'1.35x', '1x'};
        right.Padding = [0 0 0 0];
        right.RowSpacing = 8;

        h.axMain = uiaxes(right);
        h.axMain.Layout.Row = 1;
        title(h.axMain, 'Outer ear, middle ear, and the cascaded response');
        xlabel(h.axMain, 'Frequency (Hz)');
        ylabel(h.axMain, 'Gain (dB)');
        h.axMain.XScale = 'log';
        h.axMain.XLim = [20 20000];
        grid(h.axMain, 'on');
        h.axMain.XMinorGrid = 'on';
        hold(h.axMain, 'on');

        h.line.outer = plot(h.axMain, fPlot, nan(size(fPlot)), ...
            'LineWidth', 1.3, 'LineStyle', '--', 'Color', [0 0.45 0.74], ...
            'DisplayName', 'Outer ear alone');
        h.line.middle = plot(h.axMain, fPlot, nan(size(fPlot)), ...
            'LineWidth', 1.3, 'LineStyle', '--', 'Color', [0.93 0.69 0.13], ...
            'DisplayName', 'Middle ear alone (healthy)');
        h.line.middleOME = plot(h.axMain, fPlot, nan(size(fPlot)), ...
            'LineWidth', 1.3, 'LineStyle', '--', 'Color', [0.85 0.33 0.10], ...
            'DisplayName', 'Middle ear alone (OME)');
        h.line.total = plot(h.axMain, fPlot, nan(size(fPlot)), ...
            'LineWidth', 2.6, 'LineStyle', '-', 'Color', [0 0.45 0.74], ...
            'DisplayName', 'Combined, normal ear');
        h.line.totalOME = plot(h.axMain, fPlot, nan(size(fPlot)), ...
            'LineWidth', 2.6, 'LineStyle', '--', 'Color', [0.64 0.08 0.18], ...
            'DisplayName', 'Combined, diseased ear');
        legend(h.axMain, 'Location', 'southwest', 'FontSize', 9);

        bottom = uigridlayout(right, [1 2]);
        bottom.ColumnWidth = {'1.25x', '1x'};
        bottom.Layout.Row = 2;
        bottom.Padding = [0 0 0 0];
        bottom.ColumnSpacing = 8;

        h.axSweep = uiaxes(bottom);
        title(h.axSweep, 'Parameter sweep (combined response)');
        xlabel(h.axSweep, 'Frequency (Hz)');
        ylabel(h.axSweep, 'Gain (dB)');
        h.axSweep.XScale = 'log';
        h.axSweep.XLim = [20 20000];
        grid(h.axSweep, 'on');
        hold(h.axSweep, 'on');

        infoCol = uigridlayout(bottom, [3 1]);
        infoCol.RowHeight = {'1x', 22, 108};
        infoCol.Padding = [0 0 0 0];
        infoCol.RowSpacing = 6;

        h.readout = uitextarea(infoCol, 'Editable', 'off', 'FontName', 'Menlo');
        h.readout.Layout.Row = 1;

        t4 = uilabel(infoCol, 'Text', 'Audio audition', 'FontWeight', 'bold');
        t4.Layout.Row = 2;

        aud = uigridlayout(infoCol, [3 2]);
        aud.RowHeight = {30, 30, 30};
        aud.Padding = [0 0 0 0];
        aud.RowSpacing = 5;
        aud.ColumnSpacing = 5;
        aud.Layout.Row = 3;

        h.audioSrc = uidropdown(aud, ...
            'Items', {'White noise', 'Pink noise', 'Log chirp 20-20k', 'Click train'}, ...
            'ItemsData', {'white','pink','chirp','clicks'});
        h.audioSrc.Layout.Row = 1; h.audioSrc.Layout.Column = [1 2];

        b1 = uibutton(aud, 'Text', 'Play original', ...
            'ButtonPushedFcn', @(~,~) playAudio(false));
        b1.Layout.Row = 2; b1.Layout.Column = 1;
        h.playEar = uibutton(aud, 'Text', 'Play through ear', ...
            'ButtonPushedFcn', @(~,~) playAudio(true));
        h.playEar.Layout.Row = 2; h.playEar.Layout.Column = 2;

        b3 = uibutton(aud, 'Text', 'Load audio file...', ...
            'ButtonPushedFcn', @(~,~) loadAudio());
        b3.Layout.Row = 3; b3.Layout.Column = 1;
        b4 = uibutton(aud, 'Text', 'Stop', ...
            'ButtonPushedFcn', @(~,~) stopAudio());
        b4.Layout.Row = 3; b4.Layout.Column = 2;
    end

%% ======================================================================
%  Parameters live in two structs; these keep the slider table generic.
    function v = getParam(name)
        k = find(strcmp(specs(:,1), name), 1);
        if strcmp(specs{k,8}, 'outer'), v = p1.(name); else, v = p2.(name); end
    end

    function setParam(name, val)
        k = find(strcmp(specs(:,1), name), 1);
        if strcmp(specs{k,8}, 'outer'), p1.(name) = val; else, p2.(name) = val; end
    end

%  Apply a pathology preset on top of the current healthy slider values.
%  The multipliers come straight from MIDDLEEARPARAMS, which is the single
%  source of truth for them -- this only re-applies them, it does not
%  redefine them.
    function q = applyCondition(base, cond)
        % MIDDLEEARPARAMS builds the diseased ear from physical quantities
        % (fill fraction, fluid depth), so we take its version wholesale and
        % then re-apply whatever the user has moved the four middle-ear
        % sliders to, as a ratio against the healthy default. That keeps the
        % sliders meaningful while a pathology is selected, without
        % re-deriving the pathology here.
        if strcmp(cond, 'normal')
            q = base;
            return;
        end
        q  = middleEarParams('otitisMedia', cond);
        d0 = middleEarParams();
        for ii = 1:size(specs,1)
            if strcmp(specs{ii,8}, 'middle')
                nm2 = specs{ii,1};
                q.(nm2) = q.(nm2) * (base.(nm2)/d0.(nm2));
            end
        end
    end

%% ======================================================================
    function onSlider(name, val)
        setParam(name, val);
        refresh();
    end

    function onCanalModel(val)
        p1.canalModel = val;
        refresh();
    end

    function onCondition(val)
        condition = val;
        refresh();
    end

    function resetAll()
        p1 = outerEarParams();
        p2 = middleEarParams();
        for k = 1:size(specs,1)
            sl.(specs{k,1}).Value = getParam(specs{k,1});
        end
        h.canalModel.Value = p1.canalModel;
        condition = 'normal';
        h.condition.Value = condition;
        clearSweep();
        refresh();
    end

%% ======================================================================
    function refresh()
        % slider labels
        for k = 1:size(specs,1)
            name = specs{k,1};
            txt = sprintf(['%s: ' specs{k,7} ' %s'], specs{k,2}, ...
                getParam(name)*specs{k,5}, specs{k,6});
            lb.(name).Text = strtrim(txt);
        end

        Cn = combinedEarResponse(p1, p2, fPlot);        % healthy reference

        set(h.line.outer,  'YData', db(Cn.Houter));
        set(h.line.middle, 'YData', db(Cn.Hmiddle));
        set(h.line.total,  'YData', db(Cn.total));

        if strcmp(condition, 'normal')
            Co = [];
            set(h.line.middleOME, 'YData', nan(size(fPlot)), 'Visible', 'off');
            set(h.line.totalOME,  'YData', nan(size(fPlot)), 'Visible', 'off');
        else
            Co = combinedEarResponse(p1, applyCondition(p2, condition), fPlot);
            set(h.line.middleOME, 'YData', db(Co.Hmiddle), 'Visible', 'on');
            set(h.line.totalOME,  'YData', db(Co.total),   'Visible', 'on');
        end

        allv = [db(Cn.total); db(Cn.Hmiddle); db(Cn.Houter)];
        if ~isempty(Co), allv = [allv; db(Co.total)]; end
        allv = allv(isfinite(allv));
        if ~isempty(allv)
            lo = min(-25, floor((min(allv)-3)/5)*5);
            hi = max( 40, ceil((max(allv)+3)/5)*5);
            h.axMain.YLim = [lo hi];
        end

        updateReadout(Cn, Co);
    end

    function updateReadout(Cn, Co)
        R1 = Cn.outer;
        R2 = Cn.middle;
        tot = db(Cn.total);
        [pk, ipk] = max(tot);

        L = {};
        L{end+1} = '--- outer ear ---';
        L{end+1} = sprintf('Concha Helmholtz : %7.0f Hz', R1.fHelmholtz);
        if strcmpi(p1.canalModel, 'quarterwave')
            L{end+1} = sprintf('Canal 1/4-wave   : %7.0f Hz', R1.fCanal(1));
        else
            L{end+1} = sprintf('IEC318 LC f0     : %7.0f Hz', R1.fCanal(1));
        end
        if isempty(R1.fNotch)
            L{end+1} = 'Pinna notch      : (none)';
        else
            L{end+1} = sprintf('Pinna notch      : %7.0f Hz', R1.fNotch(1));
        end

        L{end+1} = '';
        L{end+1} = '--- middle ear (healthy) ---';
        L{end+1} = sprintf('Resonance |Zin|  : %7.0f Hz', R2.fResonance);
        L{end+1} = sprintf('Peak gain        : %+6.1f dB at %.0f Hz', ...
                            R2.peakGainDb, R2.fPeak);
        L{end+1} = sprintf('Y at 226 Hz      : %7.2f mmho', adm226(R2));
        L{end+1} = '  (child 5-7 yr norm 0.2 - 1.0)';

        L{end+1} = '';
        L{end+1} = '--- cascade reliability ---';
        L{end+1} = sprintf('|Zin|/Zcanal min : %7.2f', min(Cn.loadingRatio));
        L{end+1} = sprintf('           median: %7.2f', median(Cn.loadingRatio));
        weak = Cn.loadingRatio < 3;
        if any(weak)
            L{end+1} = sprintf('  weak (<3) %.0f-%.0f Hz', ...
                min(fPlot(weak)), max(fPlot(weak)));
        else
            L{end+1} = '  >3 everywhere: cascade safe';
        end

        L{end+1} = '';
        L{end+1} = '--- combined response ---';
        L{end+1} = sprintf('peak gain : %+6.1f dB at %.0f Hz', pk, fPlot(ipk));
        L{end+1} = sprintf('gain @ 1k : %+6.1f dB', interpDb(tot, 1000));
        L{end+1} = sprintf('gain @ 3k : %+6.1f dB', interpDb(tot, 3000));

        if ~isempty(Co)
            oto = db(Co.total);
            fPTA = [500 1000 2000 4000];
            L{end+1} = '';
            L{end+1} = sprintf('--- %s ---', h.condition.Value);
            L{end+1} = sprintf('4PTA loss : %6.1f dB', ...
                mean(interp1(fPlot, tot - oto, fPTA)));
            L{end+1} = sprintf('resonance : %7.0f Hz (was %.0f)', ...
                Co.middle.fResonance, R2.fResonance);
            L{end+1} = sprintf('Y at 226  : %7.2f mmho', adm226(Co.middle));
        end

        h.readout.Value = L;
    end

    function y = adm226(R)
        % Static acoustic admittance at the 226 Hz probe tone, in mmho.
        % 1 mmho == 1e-8 m^3/(Pa*s) == the admittance of 1 cm^3 of air.
        y = 1/(interp1(fPlot, abs(R.inputImpedance), 226)*p2.Z_unitToSI)/1e-8;
    end

    function v = interpDb(tot, freq)
        v = interp1(fPlot, tot, freq, 'linear', NaN);
    end

%% ======================================================================
    function runSweep()
        name = h.sweepParam.Value;
        k = find(strcmp(specs(:,1), name), 1);
        lo = specs{k,3}; hi = specs{k,4};
        n  = 9;
        vals = linspace(lo, hi, n);

        cla(h.axSweep);
        cols = parula(n);
        saved = getParam(name);
        for i = 1:n
            setParam(name, vals(i));
            q2 = applyCondition(p2, condition);
            Cq = combinedEarResponse(p1, q2, fPlot);
            plot(h.axSweep, fPlot, db(Cq.total), 'Color', cols(i,:), ...
                'LineWidth', 1.4, 'DisplayName', ...
                sprintf(['' specs{k,7} ' %s'], vals(i)*specs{k,5}, specs{k,6}));
        end
        setParam(name, saved);
        title(h.axSweep, sprintf('Sweep: %s', specs{k,2}));
        legend(h.axSweep, 'Location', 'eastoutside', 'FontSize', 8);
    end

    function clearSweep()
        cla(h.axSweep);
        legend(h.axSweep, 'off');
        title(h.axSweep, 'Parameter sweep (combined response)');
    end

%% ======================================================================
    function exportCSV()
        [file, path] = uiputfile('combined_ear_response.csv', 'Export response');
        if isequal(file, 0), return; end
        Cn = combinedEarResponse(p1, p2, fPlot);
        Co = combinedEarResponse(p1, applyCondition(p2, condition), fPlot);
        T = table(fPlot, db(Cn.Houter), db(Cn.Hmiddle), db(Cn.total), ...
                  db(Co.Hmiddle), db(Co.total), ...
            'VariableNames', {'Frequency_Hz','Outer_dB','MiddleNormal_dB', ...
                              'CombinedNormal_dB','MiddleCondition_dB', ...
                              'CombinedCondition_dB'});
        writetable(T, fullfile(path, file));
        uialert(h.fig, sprintf('Saved to %s', fullfile(path,file)), ...
                'Export complete', 'Icon', 'success');
    end

    function exportPNG()
        % Redraw the curves into a fixed-size hidden figure rather than
        % exporting the live uiaxes: exportgraphics on a uiaxes inherits
        % whatever size the window happens to be, so a resized window would
        % silently change the resolution of the saved plot.
        [file, path] = uiputfile('combined_ear_plot.png', 'Export plot');
        if isequal(file, 0), return; end

        tmp = figure('Visible', 'off', 'Color', 'w', ...
                     'Position', [100 100 950 580]);
        if exist('theme', 'file'), theme(tmp, 'light'); end
        ax = axes(tmp);
        hold(ax, 'on');

        names = {'outer', 'middle', 'middleOME', 'total', 'totalOME'};
        for k = 1:numel(names)
            src = h.line.(names{k});
            if strcmp(src.Visible, 'off'), continue; end
            plot(ax, src.XData, src.YData, 'LineWidth', src.LineWidth, ...
                 'LineStyle', src.LineStyle, 'Color', src.Color, ...
                 'DisplayName', src.DisplayName);
        end

        ax.XScale = 'log';
        xlim(ax, [20 20000]);
        ylim(ax, h.axMain.YLim);
        grid(ax, 'on'); ax.XMinorGrid = 'on';
        xlabel(ax, 'Frequency (Hz)');
        ylabel(ax, 'Gain (dB)');
        title(ax, sprintf('Outer + middle ear  (condition: %s)', ...
                          h.condition.Value));
        legend(ax, 'Location', 'southwest', 'FontSize', 9);

        exportgraphics(tmp, fullfile(path, file), 'Resolution', 200);
        close(tmp);
        uialert(h.fig, sprintf('Saved to %s', fullfile(path,file)), ...
                'Export complete', 'Icon', 'success');
    end

%% ======================================================================
    function x = makeSource()
        switch h.audioSrc.Value
            case 'white'
                x = 0.25*randn(2*fs, 1);
            case 'pink'
                % shape white noise by 1/sqrt(f) in the frequency domain
                N = 2*fs;
                w = randn(N,1);
                W = fft(w);
                fb = [(0:N/2)'; (N/2-1:-1:1)']*(fs/N);
                sh = 1./sqrt(max(fb, 20));
                x = real(ifft(W.*sh));
                x = 0.25*x/max(abs(x));
            case 'chirp'
                T = 3;
                t = (0:1/fs:T-1/fs).';
                f0 = 20; f1 = 20000;
                % exponential sweep
                K = T*f0/log(f1/f0);
                x = 0.25*sin(2*pi*K*(exp(t/(T/log(f1/f0)))-1));
            case 'clicks'
                x = zeros(2*fs,1);
                x(1:fs/4:end) = 0.8;
        end
        if ~isempty(userAudio)
            x = userAudio;
        end
    end

    function loadAudio()
        [file, path] = uigetfile({'*.wav;*.mp3;*.flac;*.m4a', ...
                                  'Audio files'}, 'Select audio');
        if isequal(file, 0), return; end
        [y, fsr] = audioread(fullfile(path, file));
        y = mean(y, 2);                      % mono
        if fsr ~= fs
            % resample without Signal Processing Toolbox
            t0 = (0:numel(y)-1)'/fsr;
            t1 = (0:1/fs:t0(end)).';
            y  = interp1(t0, y, t1, 'linear', 0);
        end
        userAudio = 0.6*y/max(abs(y)+eps);
        uialert(h.fig, sprintf('Loaded %s (%.1f s)', file, numel(userAudio)/fs), ...
                'Audio loaded', 'Icon', 'success');
    end

    function playAudio(throughEar)
        stopAudio();
        x = makeSource();
        if throughEar
            ir = buildIR();
            y  = conv(x, ir);
            y  = y(1:numel(x));
        else
            y = x;
        end
        pk = max(abs(y));
        if pk > 0, y = 0.85*y/pk; end
        player = audioplayer(y, fs);
        play(player);
    end

    function stopAudio()
        if ~isempty(player) && isvalid(player)
            stop(player);
        end
    end

    function ir = buildIR()
        % Auditions the condition currently selected in the dropdown, so
        % switching the menu and replaying is a direct A/B of the disease.
        ir = combinedEarIR(p1, applyCondition(p2, condition), fs, irLen);
    end

%% ======================================================================
    function y = db(x)
        y = 20*log10(max(abs(x), 1e-12));
    end
end
