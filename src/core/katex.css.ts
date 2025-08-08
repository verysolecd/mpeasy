
export const katexCSS = `
/* Original KaTeX CSS */
.katex {
    font: normal 1.21em KaTeX_Main, Times New Roman, serif;
    line-height: 1.2;
    white-space: normal;
    text-indent: 0
}

.katex-display {
    display: block;
    margin: 1em 0;
    text-align: center
}

.katex-display>.katex {
    display: inline-block;
    text-align: center
}

.katex-html>.newline {
    display: block
}

.katex .katex-html {
    white-space: nowrap
}

.katex .katex-html,
.katex .katex-mathml {
    position: relative
}

.katex .hide-tail {
    display: inline-block;
    position: relative;
    width: 0;
    height: 0;
    overflow: hidden
}

.katex .frac-line {
    display: inline-block;
    width: 100%;
    height: 1px;
    background: #000;
    border-bottom: 1px solid #000;
    position: absolute
}

.katex .katex-size1 {
    font-size: .5em
}

.katex .katex-size2 {
    font-size: .7em
}

.katex .katex-size3 {
    font-size: .8em
}

.katex .katex-size4 {
    font-size: .9em
}

.katex .katex-size5 {
    font-size: 1em
}

.katex .katex-size6 {
    font-size: 1.2em
}

.katex .katex-size7 {
    font-size: 1.44em
}

.katex .katex-size8 {
    font-size: 1.728em
}

.katex .katex-size9 {
    font-size: 2.074em
}

.katex .katex-size10 {
    font-size: 2.488em
}

.katex .katex-size11 {
    font-size: 2.986em
}

.katex .delimsizing.mult .delim-size1>span {
    font-family: KaTeX_Size1
}

.katex .delimsizing.mult .delim-size4>span {
    font-family: KaTeX_Size4
}

.katex .vlist {
    display: inline-block
}

.katex .vlist>span {
    display: block
}

.katex .vlist>span>span {
    display: inline-block
}

.katex .vlist .vlist-t {
    border-bottom: 0 solid transparent
}

.katex .vlist .vlist-r {
    display: inline-block
}

.katex .pstrut {
    display: inline-block;
    width: 0
}

.katex .mspace {
    display: inline-block
}

.katex .mtable .vertical-separator {
    display: inline-block;
    margin: 0 -.025em;
    border-left: .05em solid #000
}

.katex .mtable .arraycolsep {
    display: inline-block
}

.katex .mtable .col-align-c .vlist-r {
    text-align: center
}

.katex .mtable .col-align-l .vlist-r {
    text-align: left
}

.katex .mtable .col-align-r .vlist-r {
    text-align: right
}

.katex .svg-align {
    text-align: left
}

.katex svg {
    display: block;
    position: absolute;
    width: 100%;
    height: inherit;
    fill: currentColor;
    stroke: currentColor;
    fill-rule: nonzero;
    fill-opacity: 1;
    stroke-width: 1;
    stroke-linecap: butt;
    stroke-linejoin: miter;
    stroke-miterlimit: 4;
    stroke-dasharray: none;
    stroke-dashoffset: 0;
    stroke-opacity: 1
}

.katex svg path {
    stroke: none
}

.katex img {
    border-style: none;
    min-width: 0;
    min-height: 0;
    max-width: none;
    max-height: none
}

.katex .stretchy {
    display: inline-block;
    position: relative;
    overflow: hidden
}

.katex .stretchy>span {
    display: block
}

.katex .stretchy .vec,
.katex .stretchy .wide {
    display: block;
    position: absolute;
    left: 0;
    right: 0;
    text-align: center
}

.katex .stretchy .vec-inner,
.katex .stretchy .wide-inner {
    font-family: KaTeX_Main
}

.katex .stretchy .vec-inner {
    font-size: 1.4em;
    top: -.4em
}

.katex .stretchy .wide-inner {
    font-size: 1.5em;
    top: -.45em
}

.katex .stretchy-end {
    display: inline-block
}

.katex .accent .accent-body {
    position: relative
}

.katex .accent .accent-body>span {
    width: 0
}

.katex .accent .accent-overlay {
    display: block;
    position: absolute;
    text-align: center;
    left: 0;
    right: 0
}

.katex .accent-full .accent-overlay {
    font-family: KaTeX_Main
}

.katex .accent-full.accent-full-v2 .accent-overlay {
    font-family: KaTeX_Size1
}

.katex .mathnormal {
    font-family: KaTeX_Math;
    font-style: italic
}

.katex .mathrm {
    font-style: normal
}

.katex .textit {
    font-style: italic
}

.katex .textbf {
    font-weight: 700
}

.katex .texttt {
    font-family: KaTeX_Typewriter
}

.katex .text-mathrm {
    font-family: KaTeX_Main;
    font-style: normal
}

.katex .text-textit {
    font-family: KaTeX_Main;
    font-style: italic
}

.katex .text-textbf {
    font-family: KaTeX_Main;
    font-weight: 700
}

.katex .text-textsf {
    font-family: KaTeX_SansSerif;
    font-style: normal
}

.katex .text-texttt {
    font-family: KaTeX_Typewriter;
    font-style: normal
}

.katex .mainrm {
    font-family: KaTeX_Main;
    font-style: normal
}

.katex .mathbb {
    font-family: KaTeX_AMS;
    font-style: normal
}

.katex .mathcal {
    font-family: KaTeX_Caligraphic;
    font-style: normal
}

.katex .mathfrak {
    font-family: KaTeX_Fraktur;
    font-style: normal
}

.katex .mathscr {
    font-family: KaTeX_Script;
    font-style: normal
}

.katex .mathsf {
    font-family: KaTeX_SansSerif;
    font-style: normal
}

.katex .mathtt {
    font-family: KaTeX_Typewriter;
    font-style: normal
}

.katex .amsrm {
    font-family: KaTeX_AMS;
    font-style: normal
}

.katex .textrm {
    font-family: KaTeX_Main
}

.katex .textsf {
    font-family: KaTeX_SansSerif
}

.katex .mathbf {
    font-family: KaTeX_Main;
    font-weight: 700
}

.katex .pmb {
    border: .04em solid #000;
    border-radius: .04em;
    box-shadow: .04em .04em #000
}

.katex .boldsymbol {
    font-weight: 700
}

.katex .boldsymbol.mathnormal {
    font-family: KaTeX_Math;
    font-style: italic;
    font-weight: 700
}

.katex .boldsymbol.mathrm {
    font-family: KaTeX_Main;
    font-style: normal;
    font-weight: 700
}

.katex .boldsymbol.textit {
    font-family: KaTeX_Main;
    font-style: italic;
    font-weight: 700
}

.katex .boldsymbol.textbf {
    font-family: KaTeX_Main;
    font-weight: 700
}

.katex .boldsymbol.text-mathrm {
    font-family: KaTeX_Main;
    font-style: normal;
    font-weight: 700
}

.katex .boldsymbol.text-textit {
    font-family: KaTeX_Main;
    font-style: italic;
    font-weight: 700
}

.katex .boldsymbol.text-textbf {
    font-family: KaTeX_Main;
    font-weight: 700
}

.katex .msupsub {
    text-align: left
}

.katex .mfrac>.mfrac-inner>span {
    display: inline-block;
    text-align: center
}

.katex .mfrac>.mfrac-inner>span.frac-num {
    display: block
}

.katex .mfrac>.mfrac-inner>span.frac-den {
    display: block
}

.katex .mfrac .frac-num,
.katex .mfrac .frac-den {
    width: 100%
}

.katex .mord {
    -moz-user-select: none
}

.katex .mbin,
.katex .mclose,
.katex .minner,
.katex .mopen,
.katex .mrel {
    -moz-user-select: none
}

.katex .mord.mtight {
    margin-right: -.1667em
}

.katex .mord+.mop {
    margin-left: .1667em
}

.katex .mop+.mord {
    margin-left: .1667em
}

.katex .mop+.mop {
    margin-left: .1667em
}

.katex .mord+.mbin {
    margin-left: .2222em
}

.katex .mbin+.mord {
    margin-left: .2222em
}

.katex .mord+.mrel {
    margin-left: .2778em
}

.katex .mrel+.mord {
    margin-left: .2778em
}

.katex .mord+.minner {
    margin-left: .1667em
}

.katex .minner+.mord {
    margin-left: .1667em
}

.katex .mord+.mpunct {
    margin-left: 0
}

.katex .mpunct+.mord {
    margin-left: .1667em
}

.katex .minner+.mop {
    margin-left: .1667em
}

.katex .mop+.minner {
    margin-left: .1667em
}

.katex .mop.op-limits>.vlist-r>.vlist-t,
.katex .mop.op-limits>.vlist-r>.vlist {
    text-align: center
}

.katex .op-symbol-large {
    font-size: 1.2em
}

.katex .op-symbol-small {
    font-size: .9em
}

.katex .mop-limits-v2 {
    display: inline-block;
    text-align: center
}

.katex .mop-limits-v2 .vlist-r {
    display: block
}

.katex .mop-limits-v2 .vlist-t {
    display: block
}

.katex .mop-limits-v2 .vlist {
    display: block
}

.katex .mop-limits-v2 .baseline-separator {
    display: block;
    width: 0
}

.katex .moverlay {
    text-align: left
}

.katex .rule {
    display: inline-block;
    border: 0 solid #000;
    position: relative
}

.katex .EMPTY {
    display: inline-block;
    width: 0
}

.katex .mtable .htable {
    display: inline-table;
    border-collapse: collapse
}

.katex .mtable .htable .htr {
    display: table-row
}

.katex .mtable .htable .htd {
    display: table-cell;
    padding: 0;
    text-align: left
}

.katex .mtable .htable .h-align-left {
    text-align: left
}

.katex .mtable .htable .h-align-center {
    text-align: center
}

.katex .mtable .htable .h-align-right {
    text-align: right
}

.katex .mtable .htable .h-align-decimal-point {
    text-align: right
}

.katex .mtable .htable .h-align-decimal-point .decimal-point {
    display: inline-block;
    width: 0
}

.katex .mtable .htable .h-align-decimal-point .align-pad-right {
    display: inline-block
}

.katex .mtable .baseline-v-skip {
    display: table-row;
    height: 1.2em
}

.katex .mtable .baseline-v-skip.first-row {
    height: .6em
}

.katex .mtable .baseline-v-skip.last-row {
    height: .6em
}

.katex .mtable .hline,
.katex .mtable .hdashline {
    display: table-row
}

.katex .mtable .hline>.pos-left,
.katex .mtable .hdashline>.pos-left {
    display: table-cell;
    padding: 0
}

.katex .mtable .hline>.pos-right,
.katex .mtable .hdashline>.pos-right {
    display: table-cell;
    padding: 0
}

.katex .mtable .hline>.right-pad,
.katex .mtable .hdashline>.right-pad {
    display: table-cell;
    width: 100%
}

.katex .mtable .hline>.pos-left>.hline-line,
.katex .mtable .hdashline>.pos-left>.hdashline-line {
    border-bottom: .04em solid #000;
    display: block
}

.katex .mtable .hdashline>.pos-left>.hdashline-line {
    border-bottom-style: dashed
}

.katex .mtable .hdashline>.pos-left>.hdashline-line.hdashline-leftmost {
    margin-left: .4em
}

.katex .mtable .hdashline>.pos-right>.hdashline-line {
    margin-right: .4em
}

.katex .mtable .vline,
.katex .mtable .vdashline {
    display: table-cell;
    padding: 0
}

.katex .mtable .vline>.pos-top,
.katex .mtable .vdashline>.pos-top {
    border-left: .04em solid #000;
    height: .6em
}

.katex .mtable .vdashline>.pos-top {
    border-left-style: dashed
}

.katex .mtable .vline>.pos-bottom,
.katex .mtable .vdashline>.pos-bottom {
    border-left: .04em solid #000;
    height: .6em
}

.katex .mtable .vdashline>.pos-bottom {
    border-left-style: dashed
}

.katex .mtable .vline>.liner,
.katex .mtable .vdashline>.liner {
    border-left: .04em solid #000;
    display: block;
    height: 100%
}

.katex .mtable .vdashline>.liner {
    border-left-style: dashed
}

.katex .strut {
    display: inline-block
}

.katex .textrm .strut {
    font-family: KaTeX_Main
}

.katex .mathnormal .strut {
    font-family: KaTeX_Math
}

.katex .mop .strut {
    font-family: KaTeX_Main
}

.katex .tag {
    display: inline-block;
    float: right;
    white-space: nowrap
}

.katex-display .tag {
    position: relative
}

.katex .error {
    color: #f00;
    border: 1px solid #f00;
    padding: 2px
}

.katex .enclosing {
    -moz-user-select: none
}

.katex .sqrt .sqrt-sign {
    display: inline-block;
    position: relative;
    -moz-user-select: none
}

.katex .sqrt .sqrt-line {
    display: inline-block;
    position: absolute;
    left: 0;
    height: 0;
    border-top: 1px solid #000
}

.katex .sqrt .sqrt-body {
    display: inline-block;
    padding-top: 2px;
    border-top: 1px solid transparent
}

.katex .sqrt .vlist {
    display: inline-block
}

.katex .sqrt .root {
    display: inline-block;
    vertical-align: top;
    margin-left: 5px;
    margin-right: -7px
}

.katex .x-arrow-pad {
    padding: 0 .5em
}

.katex .x-arrow,
.katex .x-arrow-label {
    display: inline-block;
    vertical-align: middle
}

.katex .x-arrow-label a {
    color: inherit;
    text-decoration: none
}

.katex .x-arrow-label-above,
.katex .x-arrow-label-below {
    text-align: center
}

.katex .x-arrow-label-above {
    padding-bottom: .2em
}

.katex .x-arrow-label-below {
    padding-top: .2em
}

.katex .x-arrow-contents {
    display: inline-block;
    vertical-align: middle
}

.katex .x-arrow-contents>span {
    display: block
}

.katex .x-arrow-line {
    display: block;
    height: 1px;
    background-color: #000;
    position: relative
}

.katex .x-arrow-line-and-tip {
    display: inline-block;
    vertical-align: middle
}

.katex .x-arrow-tip-and-wing {
    display: inline-block;
    position: relative
}

.katex .x-arrow-tip {
    display: inline-block;
    position: relative;
    border-right: .4em solid #000;
    height: .4em;
    border-top: .2em solid transparent;
    border-bottom: .2em solid transparent;
    box-sizing: border-box
}

.katex .x-arrow-wing.x-arrow-wing-left {
    display: inline-block;
    position: absolute;
    height: 0;
    border-top: .2em solid transparent;
    border-bottom: .2em solid transparent;
    border-left: .4em solid #000;
    left: 0;
    top: 50%;
    margin-top: -.2em
}

.katex .x-arrow-wing.x-arrow-wing-right {
    display: inline-block;
    position: absolute;
    height: 0;
    border-top: .2em solid transparent;
    border-bottom: .2em solid transparent;
border-right: .4em solid #000;
    right: 0;
    top: 50%;
    margin-top: -.2em
}

.katex .x-arrow-line-and-tip.x-arrow-line-and-tip-left .x-arrow-tip {
    transform: rotate(180deg)
}

.katex .x-arrow-line-and-tip.x-arrow-line-and-tip-left .x-arrow-wing.x-arrow-wing-left {
    display: none
}

.katex .x-arrow-line-and-tip.x-arrow-line-and-tip-right .x-arrow-wing.x-arrow-wing-right {
    display: none
}

.katex .x-arrow-line-and-tip.x-arrow-line-and-tip-harpoon-left .x-arrow-wing.x-arrow-wing-right {
    display: none
}

.katex .x-arrow-line-and-tip.x-arrow-line-and-tip-harpoon-right .x-arrow-wing.x-arrow-wing-left {
    display: none
}

.katex .x-arrow-line-and-tip.x-arrow-line-and-tip-harpoon-left.x-arrow-line-and-tip-left .x-arrow-wing.x-arrow-wing-left {
    display: inline-block
}

.katex .x-arrow-line-and-tip.x-arrow-line-and-tip-harpoon-right.x-arrow-line-and-tip-right .x-arrow-wing.x-arrow-wing-right {
    display: inline-block
}

.katex .x-arrow-line-and-tip.x-arrow-line-and-tip-harpoon-left.x-arrow-line-and-tip-right .x-arrow-wing.x-arrow-wing-left {
    display: none
}

.katex .x-arrow-line-and-tip.x-arrow-line-and-tip-harpoon-right.x-arrow-line-and-tip-left .x-arrow-wing.x-arrow-wing-right {
    display: none
}
`
