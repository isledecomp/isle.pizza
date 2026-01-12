<script>
    import { onDestroy } from 'svelte';
    import { debugUIVisible } from '../stores.js';

    let debugPanelOpen = false;
    let debugUIElement;
    let observer = null;

    // Set up MutationObserver when the element becomes available
    $: if (debugUIElement && !observer) {
        observer = new MutationObserver(() => {
            if (debugUIElement && debugUIElement.style.display === 'none') {
                debugUIElement.style.setProperty('display', 'block', 'important');
            }
        });
        observer.observe(debugUIElement, { attributes: true, attributeFilter: ['style'] });
    }

    // Clean up observer when component is destroyed
    onDestroy(() => {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    });

    let debugModeActive = false;
    let selectedLocation = '';
    let selectedAnimation = '';

    const keyCodeMap = {
        'Pause': { key: 'Pause', code: 'Pause', keyCode: 19 },
        'Escape': { key: 'Escape', code: 'Escape', keyCode: 27 },
        ' ': { key: ' ', code: 'Space', keyCode: 32 },
        'Tab': { key: 'Tab', code: 'Tab', keyCode: 9 },
        'F11': { key: 'F11', code: 'F11', keyCode: 122 },
        'F12': { key: 'F12', code: 'F12', keyCode: 123 },
        '+': { key: '+', code: 'NumpadAdd', keyCode: 107 },
        '-kp': { key: '-', code: 'NumpadSubtract', keyCode: 109 },
        '*': { key: '*', code: 'NumpadMultiply', keyCode: 106 },
        '/': { key: '/', code: 'NumpadDivide', keyCode: 111 },
        '0': { key: '0', code: 'Digit0', keyCode: 48 },
        '1': { key: '1', code: 'Digit1', keyCode: 49 },
        '2': { key: '2', code: 'Digit2', keyCode: 50 },
        '3': { key: '3', code: 'Digit3', keyCode: 51 },
        '4': { key: '4', code: 'Digit4', keyCode: 52 },
        '5': { key: '5', code: 'Digit5', keyCode: 53 },
        '6': { key: '6', code: 'Digit6', keyCode: 54 },
        '7': { key: '7', code: 'Digit7', keyCode: 55 },
        '8': { key: '8', code: 'Digit8', keyCode: 56 },
        '9': { key: '9', code: 'Digit9', keyCode: 57 },
    };

    const locations = [
        { value: 'c01', label: 'LCAMBA1 (01)' }, { value: 'c02', label: 'LCAMBA2 (02)' }, { value: 'c03', label: 'LCAMBA3 (03)' },
        { value: 'c04', label: 'LCAMBA4 (04)' }, { value: 'c05', label: 'LCAMCA1 (05)' }, { value: 'c06', label: 'LCAMCA2 (06)' },
        { value: 'c07', label: 'LCAMCA3 (07)' }, { value: 'c08', label: 'LCAMGS1 (08)' }, { value: 'c09', label: 'LCAMGS2 (09)' },
        { value: 'c10', label: 'LCAMGS3 (10)' }, { value: 'c11', label: 'LCAMHO1 (11)' }, { value: 'c12', label: 'LCAMHO2 (12)' },
        { value: 'c13', label: 'LCAMHO3 (13)' }, { value: 'c14', label: 'LCAMIS1 (14)' }, { value: 'c15', label: 'LCAMIS2 (15)' },
        { value: 'c16', label: 'LCAMIS3 (16)' }, { value: 'c17', label: 'LCAMIS4 (17)' }, { value: 'c18', label: 'LCAMIS5 (18)' },
        { value: 'c19', label: 'LCAMJA1 (19)' }, { value: 'c20', label: 'LCAMJA2 (20)' }, { value: 'c21', label: 'LCAMPO1 (21)' },
        { value: 'c22', label: 'LCAMPO2 (22)' }, { value: 'c23', label: 'LCAMPO3 (23)' }, { value: 'c24', label: 'LCAMPZ1 (24)' },
        { value: 'c25', label: 'LCAMPZ2 (25)' }, { value: 'c26', label: 'LCAMRA1 (26)' }, { value: 'c27', label: 'LCAMRA2 (27)' },
        { value: 'c28', label: 'LCAMRA3 (28)' }, { value: 'c29', label: 'LCAMRA4 (29)' }, { value: 'c30', label: 'LCAMRT1 (30)' },
        { value: 'c31', label: 'LCAMRT2 (31)' }, { value: 'c32', label: 'LCAMRT3 (32)' }, { value: 'c33', label: 'LCAMRT4 (33)' },
        { value: 'c34', label: 'LCAMRT5 (34)' }, { value: 'c35', label: 'LCAMRT6 (35)' }, { value: 'c36', label: 'LCAMRT7 (36)' },
        { value: 'c37', label: 'LCAMRT8 (37)' }, { value: 'c38', label: 'LCAMRT9 (38)' }, { value: 'c39', label: 'LCAMRT10 (39)' },
        { value: 'c40', label: 'LCAMRT11 (40)' }, { value: 'c41', label: 'LCAMRT12 (41)' }, { value: 'c42', label: 'LCAMRT13 (42)' },
        { value: 'c43', label: 'LCAMRT14 (43)' }, { value: 'c44', label: 'LCAMRT15 (44)' }, { value: 'c45', label: 'LCAMRT16 (45)' },
        { value: 'c46', label: 'LCAMRT17 (46)' }, { value: 'c47', label: 'LCAMRT18 (47)' }, { value: 'c48', label: 'LCAMRT19 (48)' },
        { value: 'c49', label: 'LCAMRT20 (49)' }, { value: 'c50', label: 'LCAMRT21 (50)' }, { value: 'c51', label: 'LCAMRT22 (51)' },
        { value: 'c52', label: 'LCAMRT23 (52)' }, { value: 'c53', label: 'LCAMRT24 (53)' }, { value: 'c54', label: 'LCAMRT25 (54)' },
        { value: 'c55', label: 'LCAMRT26 (55)' }, { value: 'c56', label: 'LCAMRT27 (56)' }, { value: 'c57', label: 'LCAMRT28 (57)' },
        { value: 'c58', label: 'LCAMRT29 (58)' }, { value: 'c59', label: 'LCAMRT30 (59)' }, { value: 'c60', label: 'LCAMRT31 (60)' },
        { value: 'c61', label: 'LCAMRT32 (61)' }, { value: 'c62', label: 'LCAMRT33 (62)' }, { value: 'c63', label: 'LCAMRT34 (63)' },
        { value: 'c64', label: 'LCAMRT35 (64)' }, { value: 'c65', label: 'LCAMRT36 (65)' }, { value: 'c66', label: 'LCAMRT37 (66)' },
        { value: 'c67', label: 'LCAMRT38 (67)' }, { value: 'c68', label: 'LCAMRT39 (68)' }, { value: 'c69', label: 'LCAMRT40 (69)' }
    ];

    const animations = [
        // 400-429
        { value: '400', label: 'wns050p1 (400)' }, { value: '401', label: 'wns049p1 (401)' }, { value: '402', label: 'wns048p1 (402)' },
        { value: '403', label: 'wns057rd (403)' }, { value: '404', label: 'pns123pr (404)' }, { value: '405', label: 'wns045di (405)' },
        { value: '406', label: 'wns053pr (406)' }, { value: '407', label: 'wns046mg (407)' }, { value: '408', label: 'wns051bd (408)' },
        { value: '409', label: 'pnsx48pr (409)' }, { value: '410', label: 'pnsx69pr (410)' }, { value: '411', label: 'pns125ni (411)' },
        { value: '412', label: 'pns122pr (412)' }, { value: '413', label: 'pns050p1 (413)' }, { value: '414', label: 'pns069pr (414)' },
        { value: '415', label: 'pns066db (415)' }, { value: '416', label: 'pns065rd (416)' }, { value: '417', label: 'pns067gd (417)' },
        { value: '418', label: 'pns099pr (418)' }, { value: '419', label: 'pns098pr (419)' }, { value: '420', label: 'pns097pr (420)' },
        { value: '421', label: 'pns096pr (421)' }, { value: '422', label: 'pns042bm (422)' }, { value: '423', label: 'pns045p1 (423)' },
        { value: '424', label: 'pns048pr (424)' }, { value: '425', label: 'pns043en (425)' }, { value: '426', label: 'pns022pr (426)' },
        { value: '427', label: 'pns018rd (427)' }, { value: '428', label: 'pns019pr (428)' }, { value: '429', label: 'pns021dl (429)' },
        // 500-599
        { value: '500', label: 'sba001bu (500)' }, { value: '501', label: 'sba002bu (501)' }, { value: '502', label: 'sba003bu (502)' },
        { value: '503', label: 'bns146rd (503)' }, { value: '504', label: 'bns144rd (504)' }, { value: '505', label: 'fns017la (505)' },
        { value: '506', label: 'bns005p1 (506)' }, { value: '507', label: 'bns147rd (507)' }, { value: '508', label: 'igs001na (508)' },
        { value: '509', label: 'sns003nu (509)' }, { value: '510', label: 'sgs001na (510)' }, { value: '511', label: 'sns001nu (511)' },
        { value: '512', label: 'sns002nu (512)' }, { value: '513', label: 'sgs002na (513)' }, { value: '514', label: 'sgs003na (514)' },
        { value: '515', label: 'fns001re (515)' }, { value: '516', label: 'fns0x1re (516)' }, { value: '517', label: 'fns007re (517)' },
        { value: '518', label: 'fns011re (518)' }, { value: '519', label: 'sns001cl (519)' }, { value: '520', label: 'sns002cl (520)' },
        { value: '521', label: 'sns003cl (521)' }, { value: '522', label: 'bns191en (522)' }, { value: '523', label: 'bho142en (523)' },
        { value: '524', label: 'bic143sy (524)' }, { value: '525', label: 'sja004br (525)' }, { value: '526', label: 'sja005br (526)' },
        { value: '527', label: 'sja006br (527)' }, { value: '528', label: 'sja007br (528)' }, { value: '529', label: 'sja008br (529)' },
        { value: '530', label: 'sja009br (530)' }, { value: '531', label: 'sja010br (531)' }, { value: '532', label: 'sja011br (532)' },
        { value: '533', label: 'sja012br (533)' }, { value: '534', label: 'sja013br (534)' }, { value: '535', label: 'sja014br (535)' },
        { value: '536', label: 'sja015br (536)' }, { value: '537', label: 'sja016br (537)' }, { value: '538', label: 'sja017br (538)' },
        { value: '539', label: 'sja018br (539)' }, { value: '540', label: 'sja001br (540)' }, { value: '541', label: 'sja002br (541)' },
        { value: '542', label: 'sja003br (542)' }, { value: '543', label: 'ijs001sn (543)' }, { value: '544', label: 'fjs148gd (544)' },
        { value: '545', label: 'fjs149va (545)' }, { value: '546', label: 'sjs001va (546)' }, { value: '547', label: 'sjs002va (547)' },
        { value: '548', label: 'sjs003va (548)' }, { value: '549', label: 'sjs004va (549)' }, { value: '550', label: 'fjs019rd (550)' },
        { value: '551', label: 'bjs009gd (551)' }, { value: '552', label: 'sjs001sn (552)' }, { value: '553', label: 'sjs002sn (553)' },
        { value: '554', label: 'sjs003sn (554)' }, { value: '555', label: 'sjs004sn (555)' }, { value: '556', label: 'sjs005sn (556)' },
        { value: '557', label: 'snsx31sh (557)' }, { value: '558', label: 'bns007gd (558)' }, { value: '559', label: 'fns001l1 (559)' },
        { value: '560', label: 'fns001l2 (560)' }, { value: '561', label: 'fra157bm (561)' }, { value: '562', label: 'bns145rd (562)' },
        { value: '563', label: 'ips001ro (563)' }, { value: '564', label: 'sns010ni (564)' }, { value: '565', label: 'sns003la (565)' },
        { value: '566', label: 'fps181ni (566)' }, { value: '567', label: 'ipz001rd (567)' }, { value: '568', label: 'spz004ma (568)' },
        { value: '569', label: 'spz005ma (569)' }, { value: '570', label: 'spz006ma (570)' }, { value: '571', label: 'spz004pa (571)' },
        { value: '572', label: 'spz013ma (572)' }, { value: '573', label: 'spz006pa (573)' }, { value: '574', label: 'spz014ma (574)' },
        { value: '575', label: 'spz005pa (575)' }, { value: '576', label: 'spz015ma (576)' }, { value: '577', label: 'spz007ma (577)' },
        { value: '578', label: 'spz013pa (578)' }, { value: '579', label: 'spz008ma (579)' }, { value: '580', label: 'spz014pa (580)' },
        { value: '581', label: 'spz009ma (581)' }, { value: '582', label: 'spz015pa (582)' }, { value: '583', label: 'spz007pa (583)' },
        { value: '584', label: 'spz011pe (584)' }, { value: '585', label: 'spz008pa (585)' }, { value: '586', label: 'spz009pa (586)' },
        { value: '587', label: 'spz010ma (587)' }, { value: '588', label: 'spz010pa (588)' }, { value: '589', label: 'spz011ma (589)' },
        { value: '590', label: 'spz011pa (590)' }, { value: '591', label: 'spz012pa (591)' }, { value: '592', label: 'spz001ma (592)' },
        { value: '593', label: 'spz002ma (593)' }, { value: '594', label: 'spz003ma (594)' }, { value: '595', label: 'spz003pa (595)' },
        { value: '596', label: 'fpz166p1 (596)' }, { value: '597', label: 'fpz172rd (597)' }, { value: '598', label: 'spz001pa (598)' },
        { value: '599', label: 'spz002pa (599)' },
        // 600-699
        { value: '600', label: 'ppz086bs (600)' }, { value: '601', label: 'ppz008rd (601)' }, { value: '602', label: 'ppz009pg (602)' },
        { value: '603', label: 'ivo918in (603)' }, { value: '604', label: 'spz004pe (604)' }, { value: '605', label: 'spz005pe (605)' },
        { value: '606', label: 'srp006pe (606)' }, { value: '607', label: 'spz013pe (607)' }, { value: '608', label: 'sns001pe (608)' },
        { value: '609', label: 'fra192pe (609)' }, { value: '610', label: 'fra163mg (610)' }, { value: '611', label: 'fns185gd (611)' },
        { value: '612', label: 'irt001in (612)' }, { value: '613', label: 'irtx01sl (613)' }, { value: '614', label: 'frt135df (614)' },
        { value: '615', label: 'frt137df (615)' }, { value: '616', label: 'frt139df (616)' }, { value: '617', label: 'frt025rd (617)' },
        { value: '618', label: 'frt132rd (618)' }, { value: '619', label: 'srt001rd (619)' }, { value: '620', label: 'srt003bd (620)' },
        { value: '621', label: 'sst001mg (621)' }, { value: '622', label: 'sns004la (622)' }, { value: '623', label: 'sns005la (623)' },
        { value: '624', label: 'sns006la (624)' }, { value: '625', label: 'sps004ni (625)' }, { value: '626', label: 'sps005ni (626)' },
        { value: '627', label: 'sps006ni (627)' }, { value: '628', label: 'sns007la (628)' }, { value: '629', label: 'sns008la (629)' },
        { value: '630', label: 'sns009la (630)' }, { value: '631', label: 'sns007ni (631)' }, { value: '632', label: 'sns008ni (632)' },
        { value: '633', label: 'sns009ni (633)' }, { value: '634', label: 'pns017ml (634)' }, { value: '635', label: 'sns010la (635)' },
        { value: '636', label: 'sns010pe (636)' }, { value: '637', label: 'sns011la (637)' }, { value: '638', label: 'sns012la (638)' },
        { value: '639', label: 'sns007pe (639)' }, { value: '640', label: 'sns008pe (640)' }, { value: '641', label: 'sns013la (641)' },
        { value: '642', label: 'sns013ni (642)' }, { value: '643', label: 'sns014la (643)' }, { value: '644', label: 'sns014ni (644)' },
        { value: '645', label: 'sns015la (645)' }, { value: '646', label: 'sns015ni (646)' }, { value: '647', label: 'sns011ni (647)' },
        { value: '648', label: 'sns012ni (648)' }, { value: '649', label: 'sns014pe (649)' }, { value: '650', label: 'sns015pe (650)' },
        { value: '651', label: 'sns003pe (651)' }, { value: '652', label: 'sns017ni (652)' }, { value: '653', label: 'sps001ni (653)' },
        { value: '654', label: 'sps002ni (654)' }, { value: '655', label: 'sps003ni (655)' }, { value: '656', label: 'sns017la (656)' },
        { value: '657', label: 'sps001la (657)' }, { value: '658', label: 'sps002la (658)' }, { value: '659', label: 'bns005pg (659)' },
        { value: '660', label: 'sns001ml (660)' }, { value: '661', label: 'sns002mg (661)' }, { value: '662', label: 'sns002ml (662)' },
        { value: '663', label: 'sns002pe (663)' }, { value: '664', label: 'sns003mg (664)' }, { value: '665', label: 'sns004mg (665)' },
        { value: '666', label: 'sns004rd (666)' }, { value: '667', label: 'sns006bd (667)' }, { value: '668', label: 'sns006ro (668)' },
        { value: '669', label: 'sns011in (669)' }, { value: '670', label: 'sps001ro (670)' }, { value: '671', label: 'sps002ro (671)' },
        { value: '672', label: 'sps003ro (672)' }, { value: '673', label: 'sps004ro (673)' }, { value: '674', label: 'srt005pg (674)' },
        { value: '675', label: 'pns100ml (675)' }, { value: '676', label: 'ppz029rd (676)' }, { value: '677', label: 'sns007sy (677)' },
        { value: '678', label: 'cnsx12la (678)' }, { value: '679', label: 'cnsx12ni (679)' }, { value: '680', label: 'ijs006sn (680)' },
        { value: '681', label: 'igs008na (681)' }, { value: '682', label: 'irt007in (682)' }, { value: '683', label: 'ips002ro (683)' },
        { value: '684', label: 'hho142cl (684)' }, { value: '685', label: 'hho143cl (685)' }, { value: '686', label: 'hho144cl (686)' },
        { value: '687', label: 'hho027en (687)' }, { value: '688', label: 'hps116bd (688)' }, { value: '689', label: 'hps117bd (689)' },
        { value: '690', label: 'hps118re (690)' }, { value: '691', label: 'hps120en (691)' }, { value: '692', label: 'hps122en (692)' },
        { value: '693', label: 'hpz047pe (693)' }, { value: '694', label: 'hpz048pe (694)' }, { value: '695', label: 'hpz049bd (695)' },
        { value: '696', label: 'hpz050bd (696)' }, { value: '697', label: 'hpz052ma (697)' }, { value: '698', label: 'hpz053pa (698)' },
        { value: '699', label: 'hpz055pa (699)' },
        // 700-799
        { value: '700', label: 'hpz057ma (700)' }, { value: '701', label: 'hpza51gd (701)' }, { value: '702', label: 'hpzb51gd (702)' },
        { value: '703', label: 'hpzc51gd (703)' }, { value: '704', label: 'hpzf51gd (704)' }, { value: '705', label: 'hpzw51gd (705)' },
        { value: '706', label: 'hpzx51gd (706)' }, { value: '707', label: 'hpzy51gd (707)' }, { value: '708', label: 'hpzz51gd (708)' },
        { value: '709', label: 'nic002pr (709)' }, { value: '710', label: 'nic003pr (710)' }, { value: '711', label: 'nic004pr (711)' },
        { value: '712', label: 'pps025ni (712)' }, { value: '713', label: 'pps026ni (713)' }, { value: '714', label: 'pps027ni (714)' },
        { value: '715', label: 'ppz001pe (715)' }, { value: '716', label: 'ppz006pa (716)' }, { value: '717', label: 'ppz007pa (717)' },
        { value: '718', label: 'ppz010pa (718)' }, { value: '719', label: 'ppz011pa (719)' }, { value: '720', label: 'ppz013pa (720)' },
        { value: '721', label: 'ppz014pe (721)' }, { value: '722', label: 'ppz015pe (722)' }, { value: '723', label: 'ppz016pe (723)' },
        { value: '724', label: 'pgs050nu (724)' }, { value: '725', label: 'pgs051nu (725)' }, { value: '726', label: 'pgs052nu (726)' },
        { value: '727', label: 'ppz031ma (727)' }, { value: '728', label: 'ppz035pa (728)' }, { value: '729', label: 'ppz036pa (729)' },
        { value: '730', label: 'ppz037ma (730)' }, { value: '731', label: 'ppz038ma (731)' }, { value: '732', label: 'ppz054ma (732)' },
        { value: '733', label: 'ppz055ma (733)' }, { value: '734', label: 'ppz056ma (734)' }, { value: '735', label: 'ppz059ma (735)' },
        { value: '736', label: 'ppz060ma (736)' }, { value: '737', label: 'ppz061ma (737)' }, { value: '738', label: 'ppz064ma (738)' },
        { value: '739', label: 'prt072sl (739)' }, { value: '740', label: 'prt073sl (740)' }, { value: '741', label: 'prt074sl (741)' },
        { value: '742', label: 'pho104re (742)' }, { value: '743', label: 'pho105re (743)' }, { value: '744', label: 'pho106re (744)' },
        { value: '745', label: 'ppz075pa (745)' }, { value: '746', label: 'ppz082pa (746)' }, { value: '747', label: 'ppz084pa (747)' },
        { value: '748', label: 'ppz088ma (748)' }, { value: '749', label: 'ppz089ma (749)' }, { value: '750', label: 'ppz090ma (750)' },
        { value: '751', label: 'ppz093pe (751)' }, { value: '752', label: 'ppz094pe (752)' }, { value: '753', label: 'ppz095pe (753)' },
        { value: '754', label: 'prp101pr (754)' }, { value: '755', label: 'pja126br (755)' }, { value: '756', label: 'pja127br (756)' },
        { value: '757', label: 'pja129br (757)' }, { value: '758', label: 'pja130br (758)' }, { value: '759', label: 'pja131br (759)' },
        { value: '760', label: 'pja132br (760)' }, { value: '761', label: 'ppz107ma (761)' }, { value: '762', label: 'ppz114pa (762)' },
        { value: '763', label: 'ppz117ma (763)' }, { value: '764', label: 'ppz118ma (764)' }, { value: '765', label: 'ppz119ma (765)' },
        { value: '766', label: 'ppz120pa (766)' }, { value: '767', label: 'wgs083nu (767)' }, { value: '768', label: 'wgs085nu (768)' },
        { value: '769', label: 'wgs086nu (769)' }, { value: '770', label: 'wgs087nu (770)' }, { value: '771', label: 'wgs088nu (771)' },
        { value: '772', label: 'wgs089nu (772)' }, { value: '773', label: 'wgs090nu (773)' }, { value: '774', label: 'wgs091nu (774)' },
        { value: '775', label: 'wgs092nu (775)' }, { value: '776', label: 'wgs093nu (776)' }, { value: '777', label: 'wgs094nu (777)' },
        { value: '778', label: 'wgs095nu (778)' }, { value: '779', label: 'wgs096nu (779)' }, { value: '780', label: 'wgs097nu (780)' },
        { value: '781', label: 'wgs098nu (781)' }, { value: '782', label: 'wgs099nu (782)' }, { value: '783', label: 'wgs100nu (783)' },
        { value: '784', label: 'wgs101nu (784)' }, { value: '785', label: 'wgs102nu (785)' }, { value: '786', label: 'wgs103nu (786)' },
        { value: '787', label: 'wrt060bm (787)' }, { value: '788', label: 'wrt074sl (788)' }, { value: '789', label: 'wrt075rh (789)' },
        { value: '790', label: 'wrt076df (790)' }, { value: '791', label: 'wrt078ni (791)' }, { value: '792', label: 'wrt079bm (792)' },
        { value: '793', label: 'npz001bd (793)' }, { value: '794', label: 'npz002bd (794)' }, { value: '795', label: 'npz003bd (795)' },
        { value: '796', label: 'npz004bd (796)' }, { value: '797', label: 'npz005bd (797)' }, { value: '798', label: 'npz006bd (798)' },
        { value: '799', label: 'npz007bd (799)' },
        // 800-868
        { value: '800', label: 'nca001ca (800)' }, { value: '801', label: 'nca002sk (801)' }, { value: '802', label: 'nca003gh (802)' },
        { value: '803', label: 'nla001ha (803)' }, { value: '804', label: 'nla002sd (804)' }, { value: '805', label: 'npa001ns (805)' },
        { value: '806', label: 'npa002ns (806)' }, { value: '807', label: 'npa003ns (807)' }, { value: '808', label: 'npa004ns (808)' },
        { value: '809', label: 'npa005dl (809)' }, { value: '810', label: 'npa007dl (810)' }, { value: '811', label: 'npa009dl (811)' },
        { value: '812', label: 'npa010db (812)' }, { value: '813', label: 'npa012db (813)' }, { value: '814', label: 'npa014db (814)' },
        { value: '815', label: 'npa015ca (815)' }, { value: '816', label: 'npa017ca (816)' }, { value: '817', label: 'npa019ca (817)' },
        { value: '818', label: 'npa020p1 (818)' }, { value: '819', label: 'npa022p1 (819)' }, { value: '820', label: 'npa024p1 (820)' },
        { value: '821', label: 'npa025sh (821)' }, { value: '822', label: 'npa027sh (822)' }, { value: '823', label: 'npa029sh (823)' },
        { value: '824', label: 'npa030fl (824)' }, { value: '825', label: 'npa031fl (825)' }, { value: '826', label: 'npa032fl (826)' },
        { value: '827', label: 'npa034bh (827)' }, { value: '828', label: 'npa035bh (828)' }, { value: '829', label: 'npa036bh (829)' },
        { value: '830', label: 'npa038pn (830)' }, { value: '831', label: 'npa039pn (831)' }, { value: '832', label: 'npa040pn (832)' },
        { value: '833', label: 'npa042pm (833)' }, { value: '834', label: 'npa043pm (834)' }, { value: '835', label: 'npa044pm (835)' },
        { value: '836', label: 'npa046sr (836)' }, { value: '837', label: 'npa047sr (837)' }, { value: '838', label: 'npa048sr (838)' },
        { value: '839', label: 'npa050ba (839)' }, { value: '840', label: 'npa051ba (840)' }, { value: '841', label: 'npa052ba (841)' },
        { value: '842', label: 'npa054po (842)' }, { value: '843', label: 'npa055po (843)' }, { value: '844', label: 'npa056po (844)' },
        { value: '845', label: 'npa058r1 (845)' }, { value: '846', label: 'npa059r1 (846)' }, { value: '847', label: 'npa060r1 (847)' },
        { value: '848', label: 'npa061r3 (848)' }, { value: '849', label: 'npa062r2 (849)' }, { value: '850', label: 'npa062r3 (850)' },
        { value: '851', label: 'npa063r2 (851)' }, { value: '852', label: 'npa063r3 (852)' }, { value: '853', label: 'npa065r2 (853)' },
        { value: '854', label: 'nja001pr (854)' }, { value: '855', label: 'nja002pr (855)' }, { value: '856', label: 'sjs007in (856)' },
        { value: '857', label: 'sns005in (857)' }, { value: '858', label: 'sns006in (858)' }, { value: '859', label: 'sns008in (859)' },
        { value: '860', label: 'sjs012in (860)' }, { value: '861', label: 'sjs013in (861)' }, { value: '862', label: 'sjs014in (862)' },
        { value: '863', label: 'sjs015in (863)' }, { value: '864', label: 'srt001in (864)' }, { value: '865', label: 'srt002in (865)' },
        { value: '866', label: 'srt003in (866)' }, { value: '867', label: 'srt004in (867)' }, { value: '868', label: 'nrtflag0 (868)' }
    ];

    function sendKey(key) {
        const canvas = document.getElementById('canvas');
        let keyInfo = keyCodeMap[key];

        if (!keyInfo) {
            const char = key.toLowerCase();
            const charCode = char.charCodeAt(0);
            keyInfo = {
                key: char,
                code: 'Key' + char.toUpperCase(),
                keyCode: charCode >= 97 && charCode <= 122 ? charCode - 32 : charCode
            };
        }

        const eventInit = {
            key: keyInfo.key,
            code: keyInfo.code,
            keyCode: keyInfo.keyCode,
            which: keyInfo.keyCode,
            bubbles: true,
            cancelable: true
        };

        canvas.dispatchEvent(new KeyboardEvent('keydown', eventInit));
        canvas.dispatchEvent(new KeyboardEvent('keyup', eventInit));
    }

    function sendKeySequence(keys, delay = 100) {
        let index = 0;
        const canvas = document.getElementById('canvas');

        function sendNext() {
            if (index < keys.length) {
                sendKey(keys[index]);
                index++;
                setTimeout(sendNext, delay);
            } else {
                canvas.focus();
            }
        }
        sendNext();
    }

    function enterDebugMode() {
        sendKeySequence(['o', 'g', 'e', 'l']);
        debugModeActive = true;
    }

    function handleAction(keys, requiresDebug = false) {
        if (requiresDebug && !debugModeActive) {
            enterDebugMode();
            setTimeout(() => sendKeySequence(keys.split('')), 500);
        } else if (keys.length > 1 && !keyCodeMap[keys]) {
            sendKeySequence(keys.split(''));
        } else {
            sendKey(keys);
            document.getElementById('canvas').focus();
        }
    }

    function gotoLocation() {
        if (!selectedLocation) return;
        if (!debugModeActive) {
            enterDebugMode();
            setTimeout(() => sendKeySequence(selectedLocation.split('')), 500);
        } else {
            sendKeySequence(selectedLocation.split(''));
        }
    }

    function playAnimation() {
        if (!selectedAnimation) return;
        const paddedId = selectedAnimation.padStart(3, '0');
        const keys = ['v', ...paddedId.split('')];

        if (!debugModeActive) {
            enterDebugMode();
            setTimeout(() => sendKeySequence(keys), 500);
        } else {
            sendKeySequence(keys);
        }
    }
</script>

{#if $debugUIVisible}
    <div id="debug-ui" bind:this={debugUIElement}>
        <button id="debug-toggle" title="Debug Options" class:active={debugPanelOpen} onclick={() => debugPanelOpen = !debugPanelOpen}>⚙</button>

        {#if debugPanelOpen}
            <div id="debug-panel" class="open">
                <div class="debug-header">Debug Options</div>

                <div class="debug-section">
                    <div class="debug-section-title">General</div>
                    <button onclick={() => handleAction('Pause')}>Pause/Resume</button>
                    <button onclick={() => handleAction('Escape')}>Return to Infocenter</button>
                    <button onclick={() => handleAction(' ')}>Skip Animation</button>
                    <button onclick={() => handleAction('F12')}>Save Game</button>
                </div>

                <div class="debug-section">
                    <div class="debug-section-title">Debug Mode (OGEL)</div>
                    <button class="debug-password" class:active={debugModeActive} onclick={enterDebugMode}>
                        {debugModeActive ? 'Debug Mode Active' : 'Enter Debug Mode'}
                    </button>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={() => handleAction('Tab', true)}>Toggle FPS</button>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={() => handleAction('s', true)}>Toggle Music</button>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={() => handleAction('p', true)}>Reset/Load Plants</button>
                </div>

                <div class="debug-section">
                    <div class="debug-section-title">Camera/View</div>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={() => handleAction('u', true)}>Move Up</button>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={() => handleAction('d', true)}>Move Down</button>
                </div>

                <div class="debug-section">
                    <div class="debug-section-title">LOD (Level of Detail)</div>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={() => handleAction('f', true)}>LOD 0.0 (Lowest)</button>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={() => handleAction('x', true)}>LOD 3.6 (Default)</button>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={() => handleAction('h', true)}>LOD 5.0 (Highest)</button>
                </div>

                <div class="debug-section">
                    <div class="debug-section-title">Misc</div>
                    <button onclick={() => handleAction('z')}>Make Plants Dance</button>
                </div>

                <div class="debug-section">
                    <div class="debug-section-title">Switch Act</div>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={() => handleAction('g2', true)}>Act 2</button>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={() => handleAction('g3', true)}>Act 3</button>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={() => handleAction('g4', true)}>Good Ending</button>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={() => handleAction('g5', true)}>Bad Ending</button>
                </div>

                <div class="debug-section">
                    <div class="debug-section-title">Locations</div>
                    <select id="debug-location-select" bind:value={selectedLocation}>
                        <option value="">-- Select Location --</option>
                        {#each locations as loc}
                            <option value={loc.value}>{loc.label}</option>
                        {/each}
                    </select>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={gotoLocation}>Go to Location</button>
                </div>

                <div class="debug-section">
                    <div class="debug-section-title">Animations</div>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={() => handleAction('va', true)}>Play <b>all</b> cam animations</button>
                    <select id="debug-animation-select" bind:value={selectedAnimation}>
                        <option value="">-- Select Animation --</option>
                        {#each animations as anim}
                            <option value={anim.value}>{anim.label}</option>
                        {/each}
                    </select>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={playAnimation}>Play Animation</button>
                </div>
            </div>
        {/if}
    </div>
{/if}

<style>
    /* Styles moved to app.css for #debug-ui */
</style>
