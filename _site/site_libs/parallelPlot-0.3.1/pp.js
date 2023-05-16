"use strict";
// eslint-disable-next-line no-unused-vars
var pp;
(function (pp) {
    class BrushSlider {
        constructor(parallelPlot) {
            this.dimIndexScale = d3.scalePoint();
            this.dimIndexScaleInvertFn = d3.scaleQuantize();
            this.inSelectionDrag = false;
            this.parallelPlot = parallelPlot;
            this.updateDimIndexScale();
            // Create the slider axis
            const axis = d3.select(parallelPlot.bindto + " .slider").append("g")
                .attr("pointer-events", "none")
                .attr("class", "axisGroup")
                // Tick Values set to none to have no overlayed names
                .call(d3.axisBottom(this.dimIndexScale).tickSize(0).tickFormat(() => ""));
            d3.select(parallelPlot.bindto).append("div")
                .attr("class", "sliderTooltip")
                .style("display", "none");
            this.createBrush();
            axis.append("line")
                .attr("class", "locatorLine")
                .attr("x1", 50)
                .attr("y1", -8)
                .attr("x2", 50)
                .attr("y2", 8)
                .style("display", "none")
                .attr("pointer-events", "none");
            // Adapt slider to dimensions
            d3.select(parallelPlot.bindto + " .brushDim").call(d3.brushX().move, [
                this.dimIndexScale(this.parallelPlot.startingDimIndex),
                this.dimIndexScale(this.parallelPlot.startingDimIndex + this.parallelPlot.visibleDimCount - 1)
            ]);
        }
        updateDimIndexScale() {
            const size = this.parallelPlot.width - pp.ParallelPlot.margin.left - pp.ParallelPlot.margin.right;
            this.dimIndexScale
                .domain(d3.range(this.parallelPlot.dimensions.length))
                .range([0, size]);
            this.dimIndexScaleInvertFn
                .domain([0, size])
                .range(d3.range(this.parallelPlot.dimensions.length));
        }
        centerBrush(indexCenter, moveBrush) {
            const sizeDimVisible = this.parallelPlot.visibleDimensions.length;
            let sizeLeft = Math.round((sizeDimVisible - 1) / 2.0);
            let sizeRight = sizeDimVisible - 1 - sizeLeft;
            if (indexCenter - sizeLeft < 0) {
                sizeRight = sizeRight + (sizeLeft - indexCenter);
                sizeLeft = indexCenter;
            }
            if (indexCenter + sizeRight > this.parallelPlot.dimensions.length - 1) {
                sizeLeft = sizeLeft + (indexCenter + sizeRight - this.parallelPlot.dimensions.length + 1);
                sizeRight = this.parallelPlot.dimensions.length - 1 - indexCenter;
            }
            const begin = indexCenter - sizeLeft;
            const end = indexCenter + sizeRight;
            if (begin !== this.parallelPlot.startingDimIndex ||
                end !== this.parallelPlot.startingDimIndex + this.parallelPlot.visibleDimCount - 1) {
                this.updateVisibleDimensions(begin, end);
                this.parallelPlot.buildPlotArea();
                this.parallelPlot.style.applyCssRules();
                d3.select(this.parallelPlot.bindto + " .sliderTooltip").style("display", "none");
            }
            if (moveBrush) {
                // Modify the brush selection
                d3.select(this.parallelPlot.bindto + " .brushDim").call(d3.brushX().move, [
                    this.dimIndexScale(this.parallelPlot.startingDimIndex),
                    this.dimIndexScale(this.parallelPlot.startingDimIndex + this.parallelPlot.visibleDimCount - 1)
                ]);
            }
        }
        mouseDown(mouse) {
            this.centerBrush(this.dimIndexScaleInvertFn(mouse[0]), true);
            d3.event.stopPropagation();
        }
        mouseMove(mouse) {
            d3.select(this.parallelPlot.bindto + " .locatorLine")
                .style("display", null)
                .attr("x1", mouse[0])
                .attr("x2", mouse[0]);
            const dimIndex = this.dimIndexScaleInvertFn(mouse[0]);
            d3.select(this.parallelPlot.bindto + " .sliderTooltip")
                .text(this.parallelPlot.columns[this.parallelPlot.dimensions[dimIndex]].label)
                .style("left", mouse[0] - pp.ParallelPlot.margin.left + "px")
                .style("top", pp.ParallelPlot.margin.top / 4.0 - 30 + "px")
                .style("display", null);
        }
        mouseExit() {
            d3.select(this.parallelPlot.bindto + " .locatorLine").style("display", "none");
            d3.select(this.parallelPlot.bindto + " .sliderTooltip").style("display", "none");
        }
        // eslint-disable-next-line max-lines-per-function
        createBrush() {
            const thisBS = this;
            this.inSelectionDrag = false;
            d3.select(this.parallelPlot.bindto + " .slider").append("g")
                .attr("class", "brushDim")
                // Call 'd3.brushX()' to create the SVG elements necessary to display the brush selection and to receive input events for interaction
                .call(this.xBrushBehavior())
                // Listen mouve events of 'overlay' group to center brush (if clicked) or show a tooltip
                .call(g => g.select(this.parallelPlot.bindto + " .overlay")
                // @ts-ignore
                .on("mousedown touchstart", function () { thisBS.mouseDown(d3.mouse(this)); })
                // @ts-ignore
                .on("mousemove", function () { thisBS.mouseMove(d3.mouse(this)); })
                // @ts-ignore
                .on("mouseout", function () { thisBS.mouseExit(d3.mouse(this)); }))
                // Listen mouve events of 'selection' group to update 'drag' flag
                .call(g => g.select(this.parallelPlot.bindto + " .selection")
                .on("mousedown", function () { thisBS.inSelectionDrag = true; })
                .on("mouseup", function () { thisBS.inSelectionDrag = false; }));
        }
        xBrushBehavior() {
            const thisBS = this;
            return d3.brushX()
                .handleSize(4)
                // Set brushable area
                .extent([
                [0, -10],
                [this.parallelPlot.width - pp.ParallelPlot.margin.left - pp.ParallelPlot.margin.right, 10]
            ])
                // When the brush moves (such as on mousemove), brush is dragged or a brush bound is moved
                .on("brush", function () {
                const selection = d3.event.selection;
                if (thisBS.inSelectionDrag) {
                    // if brush is dragged, use 'centerBrush' to keep unchanged the number of selected columns
                    const brushCenter = (selection[0] + selection[1]) / 2.0;
                    const centerIndex = thisBS.dimIndexScaleInvertFn(brushCenter);
                    thisBS.centerBrush(centerIndex, false);
                }
                else {
                    const begin = thisBS.dimIndexScaleInvertFn(selection[0]);
                    const end = thisBS.dimIndexScaleInvertFn(selection[1]);
                    if (begin !== thisBS.parallelPlot.startingDimIndex ||
                        end !== thisBS.parallelPlot.startingDimIndex + thisBS.parallelPlot.visibleDimCount - 1) {
                        thisBS.updateVisibleDimensions(begin, end);
                        thisBS.parallelPlot.buildPlotArea();
                        thisBS.parallelPlot.style.applyCssRules();
                    }
                }
            })
                // At the end of a brush gesture (such as on mouseup), set 'drag' flag to 'false'
                .on("end", function () {
                thisBS.inSelectionDrag = false;
            });
        }
        updateVisibleDimensions(begin, end) {
            if (begin >= 0 && end >= 0) {
                this.parallelPlot.startingDimIndex = begin;
                this.parallelPlot.visibleDimCount = end - begin + 1;
                this.parallelPlot.updateVisibleDimensions();
            }
        }
    }
    pp.BrushSlider = BrushSlider;
})(pp || (pp = {}));
// eslint-disable-next-line no-unused-vars
var pp;
(function (pp) {
    class Categorical {
        constructor(column, categories) {
            /** for each category, how many rows are to spread */
            this.rowCountByCat = [];
            /** for each category, an array with lower and upper bounds of its 'rect' (scaled values in axis range) */
            this.boundsByCat = [];
            /**
             * Y-offset to apply for each trace point of this column when 'fromNone' arrange method is used.
             */
            this.fromNoneOffsets = null;
            /** Y-offset to apply for each trace point of this column when 'fromLeft' arrange method is used. */
            this.fromLeftOffsets = null;
            /**
             * Y-offset to apply:
             * - for each trace point of this column when 'fromRight' arrange method is used;
             * - for each outgoing trace point of this column when 'fromBoth' arrange method is used.
             */
            this.fromRightOffsets = null;
            /**
             * Y-offset to apply for each incoming trace point of this column when 'fromBoth' arrange method is used.
             */
            this.fromBothInOffsets = null;
            this.dragCat = null;
            this.initialDragCategories = null;
            this.keptCatIndexes = null;
            this.column = column;
            this.categories = categories;
            this.histoScale = d3.scaleLinear();
            this.stackGenerator = d3.stack()
                .keys(d3.range(this.categories.length))
                .value((d, key) => {
                return d[key];
            });
            this.initDone = false;
        }
        checkInitDone() {
            if (!this.initDone) {
                this.initRowCountByCat();
                this.initBoundsByCat();
                this.initDone = true;
            }
        }
        unvalidateInit() {
            this.fromNoneOffsets = null;
            this.fromLeftOffsets = null;
            this.fromRightOffsets = null;
            this.fromBothInOffsets = null;
            this.initDone = false;
        }
        initRowCountByCat() {
            const columnDim = this.column.dim;
            const parallelPlot = this.column.parallelPlot;
            this.rowCountByCat = this.categories.map(_c => 0);
            parallelPlot.sampleData.forEach(row => {
                const rowCount = this.rowCountByCat[row[columnDim]];
                if (typeof rowCount !== "undefined") {
                    this.rowCountByCat[row[columnDim]] = rowCount + 1;
                }
            });
        }
        // eslint-disable-next-line max-lines-per-function
        buildOffsetsFor(arrangeMethod) {
            const columnDim = this.column.dim;
            const parallelPlot = this.column.parallelPlot;
            let orderedRowIndexes;
            if (arrangeMethod === pp.ParallelPlot.ARRANGE_FROM_LEFT) {
                orderedRowIndexes = this.buildFromLeftRowIndexes();
            }
            else if (arrangeMethod === pp.ParallelPlot.ARRANGE_FROM_RIGHT) {
                orderedRowIndexes = this.buildFromRightRowIndexes();
            }
            else if (arrangeMethod === pp.ParallelPlot.ARRANGE_FROM_BOTH) {
                orderedRowIndexes = this.buildFromLeftRowIndexes(true);
            }
            else {
                orderedRowIndexes = d3.range(parallelPlot.sampleData.length);
            }
            const rowPositionByCat = this.categories.map(_c => 0);
            // rowPositionsByRow: for each row, what is its position in the category box
            let rowPositionsByRow = [];
            orderedRowIndexes.forEach(orderedRowIndex => {
                const row = parallelPlot.sampleData[orderedRowIndex];
                const rowPosition = rowPositionByCat[row[columnDim]];
                if (typeof rowPosition === "undefined") {
                    rowPositionsByRow.push(NaN);
                }
                else {
                    rowPositionByCat[row[columnDim]] = rowPosition + 1;
                    rowPositionsByRow.push(rowPosition);
                }
            });
            const permutedPositions = new Array(rowPositionsByRow.length);
            orderedRowIndexes.forEach((orderedRowIndex, i) => {
                permutedPositions[orderedRowIndex] = rowPositionsByRow[i];
            });
            rowPositionsByRow = permutedPositions;
            const offsets = [];
            parallelPlot.sampleData.forEach((row, i) => {
                const rowCount = this.rowCountByCat[row[columnDim]];
                if (typeof rowCount === "undefined") {
                    offsets.push(0);
                }
                else {
                    let spreaderScale = parallelPlot.catSpreaderMap.get(rowCount);
                    if (typeof spreaderScale === "undefined") {
                        spreaderScale = d3.scalePoint()
                            .domain(d3.range(rowCount)) // costly => introduce 'catSpreaderMap'
                            .padding(0.8);
                        parallelPlot.catSpreaderMap.set(rowCount, spreaderScale);
                    }
                    const bounds = this.boundsByCat[row[columnDim]];
                    const halfLength = Math.abs(bounds[1] - bounds[0]) / 2;
                    spreaderScale.range([-halfLength, halfLength]);
                    const offset = spreaderScale(rowPositionsByRow[i]);
                    if (typeof offset === "undefined") {
                        offsets.push(0);
                    }
                    else {
                        offsets.push(offset);
                    }
                }
            });
            return offsets;
        }
        getFromNoneOffsets() {
            if (this.fromNoneOffsets === null) {
                this.fromNoneOffsets = this.buildOffsetsFor(pp.ParallelPlot.ARRANGE_FROM_NONE);
            }
            return this.fromNoneOffsets;
        }
        getFromLeftOffsets() {
            if (this.fromLeftOffsets === null) {
                this.fromLeftOffsets = this.buildOffsetsFor(pp.ParallelPlot.ARRANGE_FROM_LEFT);
            }
            return this.fromLeftOffsets;
        }
        getFromRightOffsets() {
            if (this.fromRightOffsets === null) {
                this.fromRightOffsets = this.buildOffsetsFor(pp.ParallelPlot.ARRANGE_FROM_RIGHT);
            }
            return this.fromRightOffsets;
        }
        getFromBothInOffsets() {
            if (this.fromBothInOffsets === null) {
                this.fromBothInOffsets = this.buildOffsetsFor(pp.ParallelPlot.ARRANGE_FROM_BOTH);
            }
            return this.fromBothInOffsets;
        }
        inOffsets() {
            const arrangeMethod = this.column.parallelPlot.arrangeMethod;
            if (arrangeMethod === pp.ParallelPlot.ARRANGE_FROM_LEFT) {
                return this.getFromLeftOffsets();
            }
            if (arrangeMethod === pp.ParallelPlot.ARRANGE_FROM_RIGHT) {
                return this.getFromRightOffsets();
            }
            if (arrangeMethod === pp.ParallelPlot.ARRANGE_FROM_NONE) {
                return this.getFromNoneOffsets();
            }
            return this.getFromBothInOffsets();
        }
        outOffsets() {
            const arrangeMethod = this.column.parallelPlot.arrangeMethod;
            if (arrangeMethod === pp.ParallelPlot.ARRANGE_FROM_BOTH) {
                return this.getFromRightOffsets();
            }
            return this.inOffsets();
        }
        buildFromLeftRowIndexes(bothMethod) {
            const columnDim = this.column.dim;
            const parallelPlot = this.column.parallelPlot;
            const columnDimIndex = parallelPlot.dimensions.indexOf(columnDim);
            const fromLeftRowIndexes = d3.range(parallelPlot.sampleData.length);
            fromLeftRowIndexes.sort((rowIndex1, rowIndex2) => {
                let diff = 0;
                let usedDimIndex = columnDimIndex - 1;
                let usedColumnName = "";
                while (diff === 0 && usedDimIndex >= 0) {
                    usedColumnName = parallelPlot.dimensions[usedDimIndex];
                    diff = parallelPlot.sampleData[rowIndex2][usedColumnName] - parallelPlot.sampleData[rowIndex1][usedColumnName];
                    const usedColumn = parallelPlot.columns[usedColumnName];
                    if (bothMethod && diff === 0 && usedColumn.categorical) {
                        const previousOutOffsets = usedColumn.categorical.outOffsets();
                        diff = previousOutOffsets[rowIndex1] - previousOutOffsets[rowIndex2];
                    }
                    usedDimIndex = usedDimIndex - 1;
                }
                if (diff === 0) {
                    usedDimIndex = columnDimIndex + 1;
                    while (diff === 0 && usedDimIndex <= parallelPlot.dimensions.length - 1) {
                        usedColumnName = parallelPlot.dimensions[usedDimIndex];
                        diff = parallelPlot.sampleData[rowIndex2][usedColumnName] - parallelPlot.sampleData[rowIndex1][usedColumnName];
                        usedDimIndex = usedDimIndex + 1;
                    }
                }
                if (diff !== 0) {
                    const column = parallelPlot.columns[usedColumnName];
                    if (column.continuous && column.continuous.invertedAxe) {
                        diff = -diff;
                    }
                }
                return (diff === 0) ? rowIndex1 - rowIndex2 : diff;
            });
            return fromLeftRowIndexes;
        }
        buildFromRightRowIndexes() {
            const columnDim = this.column.dim;
            const parallelPlot = this.column.parallelPlot;
            const columnDimIndex = parallelPlot.dimensions.indexOf(columnDim);
            const fromRightRowIndexes = d3.range(parallelPlot.sampleData.length);
            fromRightRowIndexes.sort((rowIndex1, rowIndex2) => {
                let diff = 0;
                let usedDimIndex = columnDimIndex + 1;
                let usedColumnName = "";
                while (diff === 0 && usedDimIndex <= parallelPlot.dimensions.length - 1) {
                    usedColumnName = parallelPlot.dimensions[usedDimIndex];
                    diff = parallelPlot.sampleData[rowIndex2][usedColumnName] - parallelPlot.sampleData[rowIndex1][usedColumnName];
                    usedDimIndex = usedDimIndex + 1;
                }
                if (diff === 0) {
                    usedDimIndex = columnDimIndex - 1;
                    while (diff === 0 && usedDimIndex >= 0) {
                        usedColumnName = parallelPlot.dimensions[usedDimIndex];
                        diff = parallelPlot.sampleData[rowIndex2][usedColumnName] - parallelPlot.sampleData[rowIndex1][usedColumnName];
                        usedDimIndex = usedDimIndex - 1;
                    }
                }
                if (diff !== 0) {
                    const column = parallelPlot.columns[usedColumnName];
                    if (column.continuous && column.continuous.invertedAxe) {
                        diff = -diff;
                    }
                }
                return (diff === 0) ? rowIndex1 - rowIndex2 : diff;
            });
            return fromRightRowIndexes;
        }
        initBoundsByCat() {
            const parallelPlot = this.column.parallelPlot;
            const yScale = d3.scaleLinear()
                .domain([0, parallelPlot.sampleData.length])
                .range([parallelPlot.axeHeight - Categorical.TOTAL_SPACE_BETWEEN, 0]);
            let visibleCatCount;
            if (parallelPlot.catEquallySpacedLines) {
                this.boundsByCat = this.stackGenerator([this.rowCountByCat])
                    .map(series => series[0].map(yScale));
                visibleCatCount = this.rowCountByCat.filter(rowCount => rowCount !== 0).length;
            }
            else {
                const sameCountByCat = [this.rowCountByCat.map(_r => parallelPlot.sampleData.length / this.rowCountByCat.length)];
                this.boundsByCat = this.stackGenerator(sameCountByCat)
                    .map(series => series[0].map(yScale));
                visibleCatCount = this.categories.length;
            }
            if (visibleCatCount > 1) {
                const spaceBetween = Categorical.TOTAL_SPACE_BETWEEN / (visibleCatCount - 1);
                let cumulatedSpaceBetween = spaceBetween;
                for (let i = this.boundsByCat.length - 2; i >= 0; i--) {
                    this.boundsByCat[i][0] += cumulatedSpaceBetween;
                    this.boundsByCat[i][1] += cumulatedSpaceBetween;
                    if (!parallelPlot.catEquallySpacedLines || this.rowCountByCat[i] !== 0) {
                        cumulatedSpaceBetween += spaceBetween;
                    }
                }
            }
        }
        yValue(catIndex) {
            this.checkInitDone();
            const bounds = this.boundsByCat[catIndex.valueOf()];
            return (bounds[0] + bounds[1]) / 2;
        }
        invertYValue(yValue) {
            this.checkInitDone();
            for (let i = 0; i < this.boundsByCat.length; i++) {
                if (this.boundsByCat[i][0] < this.boundsByCat[i][1]
                    && this.boundsByCat[i][0] < yValue
                    && yValue < this.boundsByCat[i][1]) {
                    return i;
                }
                if (this.boundsByCat[i][1] < this.boundsByCat[i][0]
                    && this.boundsByCat[i][1] < yValue
                    && yValue < this.boundsByCat[i][0]) {
                    return i;
                }
            }
            return -1;
        }
        yTraceValueIn(rowIndex) {
            this.checkInitDone();
            const columnDim = this.column.dim;
            const parallelPlot = this.column.parallelPlot;
            const value = parallelPlot.sampleData[rowIndex][columnDim];
            return this.yValue(value) + this.inOffsets()[rowIndex];
        }
        yTraceValueOut(rowIndex) {
            this.checkInitDone();
            const columnDim = this.column.dim;
            const parallelPlot = this.column.parallelPlot;
            const value = parallelPlot.sampleData[rowIndex][columnDim];
            return this.yValue(value) + this.outOffsets()[rowIndex];
        }
        format(value) {
            if (value >= 0 && value < this.categories.length) {
                return Number.isInteger(value.valueOf()) ? this.categories[value.valueOf()].toString() : "";
            }
            console.warn(value, " is not valid, it should be between 0 and ", this.categories.length);
            return "";
        }
        catWithoutTraces() {
            return this.categories.filter((_cat, i) => this.rowCountByCat[i] === 0);
        }
        // eslint-disable-next-line max-lines-per-function
        refreshBoxesRep() {
            this.initBoundsByCat();
            const thisCategorical = this;
            const columnDim = this.column.dim;
            const parallelPlot = this.column.parallelPlot;
            const categoricalGroup = d3.selectAll(parallelPlot.bindto + " .catGroup")
                .filter(dim => dim === columnDim);
            categoricalGroup
                .selectAll(".category")
                .style("display", function (_cat, i) {
                return parallelPlot.catEquallySpacedLines && thisCategorical.rowCountByCat[i] === 0
                    ? "none"
                    : null;
            })
                .transition()
                .ease(d3.easeBackOut)
                .duration(pp.ParallelPlot.D3_TRANSITION_DURATION)
                .attr("transform", function (_cat, i) {
                return "translate(0," + thisCategorical.yValue(i) + ")";
            });
            categoricalGroup
                .selectAll(".category .box")
                .transition()
                .ease(d3.easeBackOut)
                .duration(pp.ParallelPlot.D3_TRANSITION_DURATION)
                .attr("y", function (_cat, i) {
                const bounds = thisCategorical.boundsByCat[i];
                return -Math.abs(bounds[1] - bounds[0]) / 2;
            })
                .attr("height", function (_cat, i) {
                const bounds = thisCategorical.boundsByCat[i];
                return Math.abs(bounds[1] - bounds[0]);
            });
            categoricalGroup
                .selectAll(".category .barMainHisto")
                .transition()
                .ease(d3.easeBackOut)
                .duration(pp.ParallelPlot.D3_TRANSITION_DURATION)
                .attr("y", function (_cat, i) {
                const bounds = thisCategorical.boundsByCat[i];
                return -Math.abs(bounds[1] - bounds[0]) / 4;
            })
                .attr("height", function (_cat, i) {
                const bounds = thisCategorical.boundsByCat[i];
                return Math.abs(bounds[1] - bounds[0]) / 2;
            });
            categoricalGroup
                .selectAll(".category .barSecondHisto")
                .transition()
                .ease(d3.easeBackOut)
                .duration(pp.ParallelPlot.D3_TRANSITION_DURATION)
                .attr("y", function (_cat, i) {
                const bounds = thisCategorical.boundsByCat[i];
                return -Math.abs(bounds[1] - bounds[0]) / 4;
            })
                .attr("height", function (_cat, i) {
                const bounds = thisCategorical.boundsByCat[i];
                return Math.abs(bounds[1] - bounds[0]) / 2;
            });
        }
        // eslint-disable-next-line max-lines-per-function
        drawCategories() {
            const thisCategorical = this;
            const columnDim = this.column.dim;
            const parallelPlot = this.column.parallelPlot;
            const categoricalGroup = d3.selectAll(parallelPlot.bindto + " .catGroup")
                .filter(dim => dim === columnDim);
            categoricalGroup.append("rect")
                .attr("class", "catOverlay")
                .attr("x", -pp.ParallelPlot.catClusterWidth)
                .attr("height", parallelPlot.axeHeight)
                .attr("width", 2 * pp.ParallelPlot.catClusterWidth)
                .attr("opacity", 0)
                .attr("cursor", "crosshair")
                .on("click", function () {
                thisCategorical.toggleCategories();
                thisCategorical.applyCategoricalCutoffs();
                parallelPlot.sendCutoffEvent(columnDim, true);
            });
            categoricalGroup
                .selectAll(".category")
                .data(this.categories)
                .join(
            // eslint-disable-next-line max-lines-per-function
            enter => {
                const catGroup = enter.append("g")
                    .attr("class", "category tick")
                    .attr("transform", function (_cat, i) {
                    return "translate(0," + thisCategorical.yValue(i) + ")";
                })
                    .style("display", function (_cat, i) {
                    return parallelPlot.catEquallySpacedLines && thisCategorical.rowCountByCat[i] === 0
                        ? "none"
                        : null;
                });
                catGroup.append("rect")
                    .attr("class", "box")
                    .classed("active", function (_cat, i) {
                    return thisCategorical.isKept(i);
                })
                    .classed("inactive", function (_cat, i) {
                    return !thisCategorical.isKept(i);
                })
                    .attr("x", -pp.ParallelPlot.catClusterWidth / 2)
                    .attr("y", function (_cat, i) {
                    const bounds = thisCategorical.boundsByCat[i];
                    return -Math.abs(bounds[1] - bounds[0]) / 2;
                })
                    .attr("height", function (_cat, i) {
                    const bounds = thisCategorical.boundsByCat[i];
                    return Math.abs(bounds[1] - bounds[0]);
                })
                    .attr("width", pp.ParallelPlot.catClusterWidth)
                    .attr("fill-opacity", 0.3)
                    .call(d3.drag()
                    // Click Distance : 5 pixel arround .. to begin a drag .. or to have a "click" if under
                    .clickDistance(5)
                    // @ts-ignore
                    .container(function () { return this.parentNode.parentNode; })
                    .on("start", function (cat) {
                    thisCategorical.dragStart(cat);
                })
                    .on("drag", function (cat) {
                    thisCategorical.drag(cat);
                })
                    .on("end", function (cat) {
                    thisCategorical.dragEnd(cat);
                }))
                    // "onclick" must be called after 'drag' ... if not the click event is removed
                    .on("click", function (cat) {
                    const catIndex = thisCategorical.categories.indexOf(cat);
                    thisCategorical.toggleCategory(catIndex);
                    thisCategorical.applyCategoricalCutoffs();
                    parallelPlot.sendCutoffEvent(columnDim, true);
                })
                    .attr("shape-rendering", "crispEdges");
                catGroup.append("text")
                    .text(function (_cat, i) {
                    return thisCategorical.categories[i].toString();
                })
                    .attr("text-anchor", "end")
                    .attr("x", -pp.ParallelPlot.catClusterWidth);
                return catGroup;
            }, update => update, exit => exit.remove())
                .select("rect")
                .attr("fill", function (cat) {
                const catIndex = thisCategorical.categories.indexOf(cat);
                return thisCategorical.column.dim === parallelPlot.refColumnDim
                    ? parallelPlot.valueColor(catIndex)
                    : "black";
            });
        }
        dragStart(draggedCat) {
            this.dragCat = draggedCat;
            this.initialDragCategories = this.categories.slice();
        }
        drag(_draggedCat) {
            const columnDim = this.column.dim;
            const parallelPlot = this.column.parallelPlot;
            let position = d3.event.y;
            const dragCat = this.dragCat;
            const indexInitialPosition = this.categories.indexOf(dragCat);
            if (indexInitialPosition > 0) {
                const bottomCat = this.categories[indexInitialPosition - 1];
                const bottomY = this.yValue(indexInitialPosition - 1);
                if (bottomY && position > bottomY) {
                    if (this.canSwitchDimension(bottomCat, dragCat)) {
                        this.switchDimension(bottomCat, dragCat);
                    }
                    else {
                        position = bottomY;
                    }
                }
            }
            if (indexInitialPosition < this.categories.length - 1) {
                const topCat = this.categories[indexInitialPosition + 1];
                const topY = this.yValue(indexInitialPosition + 1);
                if (topY && position < topY) {
                    if (this.canSwitchDimension(dragCat, topCat)) {
                        this.switchDimension(dragCat, topCat);
                    }
                    else {
                        position = topY;
                    }
                }
            }
            const categoricalGroup = d3.selectAll(parallelPlot.bindto + " .catGroup")
                .filter(dim => dim === columnDim);
            categoricalGroup.selectAll(".category")
                .filter(cat => cat === this.dragCat)
                .transition()
                .ease(d3.easeBackOut)
                .duration(pp.ParallelPlot.D3_TRANSITION_DURATION)
                .attr("transform", function () {
                return "translate(0," + position + ")";
            });
        }
        canSwitchDimension(cat1, cat2) {
            const indexCat1 = this.categories.indexOf(cat1);
            const indexCat2 = this.categories.indexOf(cat2);
            if (indexCat1 === null || indexCat2 === null) {
                return false;
            }
            if (indexCat1 + 1 !== indexCat2) {
                return false;
            }
            return true;
        }
        switchDimension(bottomCat, topCat) {
            const thisCategorical = this;
            const columnDim = this.column.dim;
            const parallelPlot = this.column.parallelPlot;
            const bottomCatIndex = this.categories.indexOf(bottomCat);
            const topCatIndex = this.categories.indexOf(topCat);
            if (bottomCatIndex === -1 ||
                topCatIndex === -1) {
                return;
            }
            if (bottomCatIndex + 1 !== topCatIndex) {
                return;
            }
            const beforeDragCategories = this.categories.slice();
            this.categories[bottomCatIndex] = topCat;
            this.categories[topCatIndex] = bottomCat;
            // update 'this.rowCountByCat' and 'this.boundsByCat'
            const oldCatMapping = this.categories.map(cat => beforeDragCategories.indexOf(cat));
            this.rowCountByCat = oldCatMapping.map(oldCatIndex => this.rowCountByCat[oldCatIndex]);
            this.initBoundsByCat();
            const categoricalGroup = d3.selectAll(parallelPlot.bindto + " .catGroup")
                .filter(dim => dim === columnDim);
            categoricalGroup.selectAll(".category")
                .filter(cat => (cat === topCat || cat === bottomCat) &&
                cat !== this.dragCat)
                .transition()
                .ease(d3.easeBackOut)
                .duration(pp.ParallelPlot.D3_TRANSITION_DURATION)
                .attr("transform", function (cat) {
                const catIndex = thisCategorical.categories.indexOf(cat);
                return "translate(0," + thisCategorical.yValue(catIndex) + ")";
            });
        }
        dragEnd(_draggedCat) {
            const thisCategorical = this;
            const columnDim = this.column.dim;
            const parallelPlot = this.column.parallelPlot;
            const categoricalGroup = d3.selectAll(parallelPlot.bindto + " .catGroup")
                .filter(dim => dim === columnDim);
            categoricalGroup.selectAll(".category")
                .filter(cat => cat === this.dragCat)
                .transition()
                .ease(d3.easeBackOut)
                .duration(pp.ParallelPlot.D3_TRANSITION_DURATION)
                .attr("transform", function (cat) {
                const catIndex = thisCategorical.categories.indexOf(cat);
                return "translate(0," + thisCategorical.yValue(catIndex) + ")";
            });
            if (this.initialDragCategories) {
                // update 'parallelPlot.sampleData'
                const newCatMapping = this.initialDragCategories.map(cat => this.categories.indexOf(cat));
                parallelPlot.sampleData.forEach(function (row) {
                    const catValue = row[columnDim];
                    const newCatValue = newCatMapping[catValue];
                    row[columnDim] = isNaN(newCatValue) ? NaN : newCatValue;
                });
                // update 'this.keptCatIndexes'
                if (this.keptCatIndexes !== null) {
                    this.keptCatIndexes = new Set([...this.keptCatIndexes].map(catValue => newCatMapping[catValue]));
                }
                // update traces
                parallelPlot.refreshTracesPaths();
            }
            this.dragCat = null;
        }
        applyCategoricalCutoffs() {
            const thisCategorical = this;
            const columnDim = this.column.dim;
            const parallelPlot = this.column.parallelPlot;
            const categoricalGroup = d3.selectAll(parallelPlot.bindto + " .catGroup")
                .filter(dim => dim === columnDim);
            categoricalGroup.selectAll(".category rect")
                .classed("active", function (cat) {
                const catIndex = thisCategorical.categories.indexOf(cat);
                return thisCategorical.isKept(catIndex);
            })
                .classed("inactive", function (cat) {
                const catIndex = thisCategorical.categories.indexOf(cat);
                return !thisCategorical.isKept(catIndex);
            });
        }
        selectedRowCountByCat(selected) {
            const columnDim = this.column.dim;
            const rowCountByCat = this.categories.map(_c => 0);
            selected.forEach(row => {
                const rowCount = rowCountByCat[row[columnDim]];
                if (typeof rowCount !== "undefined") {
                    rowCountByCat[row[columnDim]] = rowCount + 1;
                }
            });
            return rowCountByCat;
        }
        // eslint-disable-next-line max-lines-per-function
        drawMainHistogram() {
            const thisCategorical = this;
            const columnDim = this.column.dim;
            const parallelPlot = this.column.parallelPlot;
            const categoryGroup = d3.selectAll(parallelPlot.bindto + " .catGroup")
                .filter(dim => dim === columnDim)
                .selectAll(".category");
            categoryGroup.select(".histogram").remove();
            if (!this.column.histoVisible) {
                return;
            }
            const histogramGroup = categoryGroup.append("g")
                .attr("class", "histogram")
                .attr("opacity", "0.5")
                .style("display", function () {
                return parallelPlot.selectedRows.size > parallelPlot.sampleData.length / 10.0
                    ? null
                    : "none";
            });
            const columnWidth = parallelPlot.xScaleVisibleDimension(parallelPlot.visibleDimensions[0]);
            if (typeof columnWidth === "undefined") {
                console.error("Dim '", parallelPlot.visibleDimensions[0], "' not found");
                return;
            }
            const maxBinLength = d3.max(this.rowCountByCat);
            if (typeof maxBinLength === "undefined") {
                console.error("maxBinLength not found");
                return;
            }
            // range is 70% percent of the original x() size between 2 dimensions
            this.histoScale
                .range([0, columnWidth * 0.7])
                .domain([0, maxBinLength]);
            histogramGroup
                .append("rect")
                .attr("class", "barMainHisto")
                .attr("pointer-events", "none")
                .attr("x", pp.ParallelPlot.catClusterWidth / 2 + 1)
                .attr("y", function (_cat, i) {
                const bounds = thisCategorical.boundsByCat[i];
                return -Math.abs(bounds[1] - bounds[0]) / 4;
            })
                .attr("width", function (cat) {
                const catIndex = thisCategorical.categories.indexOf(cat);
                return thisCategorical.histoScale(thisCategorical.rowCountByCat[catIndex]);
            })
                .attr("height", function (_cat, i) {
                const bounds = thisCategorical.boundsByCat[i];
                return Math.abs(bounds[1] - bounds[0]) / 2;
            })
                .style("fill", pp.ParallelPlot.mainHistoColor)
                .style("stroke", "white");
        }
        // eslint-disable-next-line max-lines-per-function
        drawSelectedHistogram(selected) {
            const thisCategorical = this;
            const columnDim = this.column.dim;
            const parallelPlot = this.column.parallelPlot;
            const categoryGroup = d3.selectAll(parallelPlot.bindto + " .catGroup")
                .filter(dim => dim === columnDim)
                .selectAll(".category");
            categoryGroup.select(".histogramSelected").remove();
            if (!this.column.histoVisible) {
                return;
            }
            const histogramGroup = categoryGroup.append("g")
                .attr("class", "histogramSelected")
                .attr("opacity", "0.4");
            const selectedRowCountByCat = this.selectedRowCountByCat(selected);
            let selectedHistoScale;
            if (selected.length > parallelPlot.sampleData.length / 10.0) {
                selectedHistoScale = this.histoScale;
            }
            else {
                const columnWidth = parallelPlot.xScaleVisibleDimension(parallelPlot.visibleDimensions[0]);
                if (typeof columnWidth === "undefined") {
                    console.error("Dim '", parallelPlot.visibleDimensions[0], "' not found");
                    return;
                }
                const maxBinLength = d3.max(selectedRowCountByCat);
                if (typeof maxBinLength === "undefined") {
                    console.error("maxBinLength not found");
                    return;
                }
                selectedHistoScale = d3.scaleLinear()
                    .range([0, columnWidth * 0.7])
                    .domain([0, maxBinLength]);
            }
            histogramGroup
                .append("rect")
                .attr("class", "barSecondHisto")
                .attr("pointer-events", "none")
                .attr("x", pp.ParallelPlot.catClusterWidth / 2 + 1)
                .attr("y", function (_cat, i) {
                const bounds = thisCategorical.boundsByCat[i];
                return -Math.abs(bounds[1] - bounds[0]) / 4;
            })
                .attr("height", function (_cat, i) {
                const bounds = thisCategorical.boundsByCat[i];
                return Math.abs(bounds[1] - bounds[0]) / 2;
            })
                .attr("width", function (cat) {
                const catIndex = thisCategorical.categories.indexOf(cat);
                return selectedHistoScale(selectedRowCountByCat[catIndex]);
            })
                .style("fill", pp.ParallelPlot.secondHistoColor)
                .style("stroke", function () {
                return "white";
            });
        }
        toggleCategory(catIndex) {
            if (this.column.categorical) {
                const categories = this.column.categorical.categories;
                if (this.keptCatIndexes === null) {
                    this.keptCatIndexes = new Set(d3.range(categories.length));
                    this.keptCatIndexes.delete(catIndex);
                }
                else if (this.keptCatIndexes.has(catIndex)) {
                    this.keptCatIndexes.delete(catIndex);
                }
                else {
                    this.keptCatIndexes.add(catIndex);
                    if (this.keptCatIndexes.size === categories.length) {
                        this.keptCatIndexes = null;
                    }
                }
            }
            else {
                console.error("categories is null but 'toggleCategory' is called.");
            }
        }
        toggleCategories() {
            if (this.column.categorical === null) {
                console.error("categories is null but 'toggleCategories' is called.");
            }
            else {
                if (this.keptCatIndexes === null) {
                    this.keptCatIndexes = new Set();
                }
                else {
                    this.keptCatIndexes = null;
                }
            }
        }
        getCutoffs() {
            const categories = this.categories;
            if (this.keptCatIndexes === null) {
                return null;
            }
            return [...this.keptCatIndexes].map(catIndex => categories[catIndex]);
        }
        setCutoffs(cutoffs) {
            if (cutoffs) {
                const columnDim = this.column.dim;
                const categories = this.categories;
                if (cutoffs.length !== 0 && typeof cutoffs[0] !== "string" && typeof cutoffs[0] !== "number") {
                    console.error("Wrong categorical cutoffs are provided:", cutoffs);
                }
                else {
                    const catCutoffs = cutoffs;
                    const indexes = catCutoffs
                        .map(catCo => {
                        const catIndex = categories.indexOf(catCo);
                        if (catIndex === -1) {
                            console.error(catCo + " is not a category of " + columnDim);
                        }
                        return catIndex;
                    })
                        .filter(index => index !== -1);
                    this.keptCatIndexes = new Set(indexes);
                }
            }
            else {
                this.keptCatIndexes = null;
            }
        }
        hasFilters() {
            return this.keptCatIndexes !== null;
        }
        isKept(value) {
            if (this.keptCatIndexes !== null) {
                return this.keptCatIndexes.has(value);
            }
            return true;
        }
    }
    Categorical.TOTAL_SPACE_BETWEEN = 30;
    pp.Categorical = Categorical;
})(pp || (pp = {}));
// eslint-disable-next-line no-unused-vars
var pp;
(function (pp) {
    class Column {
        constructor(dim, colIndex, parallelPlot, label, categories, cutoffs, histoVisibility, invertedAxe, ioType) {
            this.colIndex = colIndex;
            this.dim = dim;
            this.label = label;
            this.parallelPlot = parallelPlot;
            if (categories) {
                this.continuous = null;
                this.categorical = new pp.Categorical(this, categories);
            }
            else {
                this.categorical = null;
                this.continuous = new pp.Continuous(this, invertedAxe);
            }
            this.histoVisible = histoVisibility;
            this.setCutoffs(cutoffs);
            this.ioType = ioType;
        }
        unvalid() {
            if (this.continuous) {
                this.continuous.initDone = false;
            }
            if (this.categorical) {
                this.categorical.initDone = false;
            }
        }
        setInvertedAxe(invertedAxe) {
            if (this.continuous) {
                return this.continuous.setInvertedAxe(invertedAxe);
            }
            return false;
        }
        yTraceValue(rowIndex) {
            if (this.continuous) {
                return this.continuous.yTraceValue(rowIndex);
            }
            if (this.categorical) {
                return this.categorical.yTraceValueIn(rowIndex);
            }
            throw new Error("yTraceValue() failed");
        }
        formatedRowValue(row) {
            return this.formatedValue(row[this.dim]);
        }
        formatedValue(value) {
            if (this.continuous) {
                return pp.ExpFormat.format(value);
            }
            if (this.categorical) {
                return this.categorical.format(value);
            }
            throw new Error("formatedValue() failed");
        }
        labelText() {
            return this.label.replace(/<br>/gi, " ");
        }
        isInput() {
            return this.ioType === Column.INPUT;
        }
        isOutput() {
            return this.ioType === Column.OUTPUT;
        }
        drawMainHistogram() {
            if (this.continuous) {
                this.continuous.drawMainHistogram();
            }
            if (this.categorical) {
                this.categorical.drawMainHistogram();
            }
        }
        drawSelectedHistogram(selected) {
            if (this.continuous) {
                this.continuous.drawSelectedHistogram(selected);
            }
            if (this.categorical) {
                this.categorical.drawSelectedHistogram(selected);
            }
        }
        getCutoffs() {
            if (this.continuous) {
                return this.continuous.getCutoffs();
            }
            if (this.categorical) {
                return this.categorical.getCutoffs();
            }
            throw new Error("getCutoffs() failed");
        }
        setCutoffs(cutoffs) {
            if (this.categorical) {
                this.categorical.setCutoffs(cutoffs);
            }
            if (this.continuous) {
                this.continuous.setCutoffs(cutoffs);
            }
        }
        hasFilters() {
            if (this.continuous) {
                return this.continuous.hasFilters();
            }
            if (this.categorical) {
                return this.categorical.hasFilters();
            }
            throw new Error("hasFilters() failed");
        }
        isKept(value) {
            if (this.continuous) {
                return this.continuous.isKept(value);
            }
            if (this.categorical) {
                return this.categorical.isKept(value);
            }
            throw new Error("isKept() failed");
        }
    }
    Column.INPUT = "Input";
    Column.OUTPUT = "Output";
    pp.Column = Column;
})(pp || (pp = {}));
// eslint-disable-next-line no-unused-vars
var pp;
(function (pp) {
    class ColumnHeaders {
        // eslint-disable-next-line max-lines-per-function
        constructor(parallelPlot) {
            this.dragDimension = null;
            this.clickCount = 0;
            this.dimensionGroup = d3.select(parallelPlot.bindto + " .plotGroup").selectAll(".dimension");
            this.parallelPlot = parallelPlot;
            const thisTextColumns = this;
            this.dimensionGroup.append("text")
                .attr("class", "axisLabel")
                .on("mouseover", function () {
                d3.select(this).attr("font-weight", "bold");
            })
                .on("mouseout", function () {
                d3.select(this).attr("font-weight", "normal");
            })
                .call(d3.drag()
                // Click Distance : 5 pixel arround .. to begin a drag .. or to have a "click" if under
                .clickDistance(5)
                // @ts-ignore
                .container(function () { return this.parentNode.parentNode; })
                .on("start", function (d) {
                thisTextColumns.dragDimension = d;
            })
                .on("drag", function (dim) {
                thisTextColumns.drag(dim);
            })
                .on("end", function (dim) {
                thisTextColumns.dragEnd(dim);
            }))
                // ON click must be called after Drag ... if not the click event is removed
                .on("click", function (dim) {
                if (d3.event.defaultPrevented) {
                    return; // dragged
                }
                if (thisTextColumns.clickCount === 0) {
                    thisTextColumns.clickCount = 1;
                    setTimeout(function () {
                        if (thisTextColumns.clickCount === 1) {
                            parallelPlot.changeColorMapOnDimension(dim);
                        }
                        if (thisTextColumns.clickCount === 2) {
                            const continuous = parallelPlot.columns[dim].continuous;
                            if (continuous) {
                                if (continuous.setInvertedAxe(!continuous.invertedAxe)) {
                                    thisTextColumns.reverseDomainOnAxis(dim);
                                    parallelPlot.refreshTracesPaths();
                                }
                            }
                        }
                        thisTextColumns.clickCount = 0;
                    }, 350);
                }
                else if (thisTextColumns.clickCount === 1) {
                    thisTextColumns.clickCount = 2;
                }
            });
            this.dimensionGroup = d3.select(parallelPlot.bindto + " .plotGroup").selectAll(".dimension");
            parallelPlot.updateColumnLabels();
        }
        // eslint-disable-next-line max-lines-per-function
        drag(draggedDim) {
            let position = d3.event.x;
            const parallelPlot = this.parallelPlot;
            const dimensionGroup = this.dimensionGroup;
            const dragDimension = this.dragDimension;
            const thisTextColumns = this;
            const indexInitialPosition = parallelPlot.visibleDimensions.indexOf(dragDimension);
            if (indexInitialPosition > 0) {
                const leftDimension = parallelPlot.visibleDimensions[indexInitialPosition - 1];
                const leftX = parallelPlot.xScaleVisibleDimension(leftDimension);
                if (leftX && position < leftX) {
                    if (thisTextColumns.canSwitchDimension(leftDimension, dragDimension)) {
                        thisTextColumns.switchdimension(leftDimension, dragDimension);
                    }
                    else {
                        position = leftX;
                    }
                }
            }
            if (indexInitialPosition < parallelPlot.visibleDimensions.length - 1) {
                const rightDimension = parallelPlot.visibleDimensions[indexInitialPosition + 1];
                const rightX = parallelPlot.xScaleVisibleDimension(rightDimension);
                if (rightX && position > rightX) {
                    if (thisTextColumns.canSwitchDimension(dragDimension, rightDimension)) {
                        thisTextColumns.switchdimension(dragDimension, rightDimension);
                    }
                    else {
                        position = rightX;
                    }
                }
            }
            dimensionGroup.filter(dim => dim === draggedDim)
                .attr("transform", function (dim) {
                return `translate(${position}, ${parallelPlot.yRefRowOffset(dim)})`;
            });
        }
        dragEnd(_draggedDim) {
            const parallelPlot = this.parallelPlot;
            const dimensionGroup = this.dimensionGroup;
            const thisColumnHeaders = this;
            // Move only the second dimension switched
            dimensionGroup.filter(dim => dim === thisColumnHeaders.dragDimension)
                .transition()
                .ease(d3.easeBackOut)
                .duration(pp.ParallelPlot.D3_TRANSITION_DURATION)
                .attr("transform", function (d) {
                const x = parallelPlot.xScaleVisibleDimension(d);
                const yRefRowOffset = parallelPlot.yRefRowOffset(d);
                return `translate(${x}, ${yRefRowOffset})`;
            });
            parallelPlot.refreshTracesPaths();
            thisColumnHeaders.dragDimension = null;
        }
        canSwitchDimension(dim1, dim2) {
            const parallelPlot = this.parallelPlot;
            const indexDim1 = parallelPlot.dimensions.indexOf(dim1);
            const indexDim2 = parallelPlot.dimensions.indexOf(dim2);
            if (indexDim1 === null || indexDim2 === null) {
                return false;
            }
            if (indexDim1 + 1 !== indexDim2) {
                return false;
            }
            return true;
        }
        // eslint-disable-next-line max-lines-per-function
        switchdimension(leftDim, rightDim) {
            const parallelPlot = this.parallelPlot;
            const dimensionGroup = this.dimensionGroup;
            const thisColumnHeaders = this;
            const leftVisibleIndex = parallelPlot.visibleDimensions.indexOf(leftDim);
            const rightVisibleIndex = parallelPlot.visibleDimensions.indexOf(rightDim);
            const leftSliderIndex = parallelPlot.dimensions.indexOf(leftDim);
            const rightSliderIndex = parallelPlot.dimensions.indexOf(rightDim);
            if (leftVisibleIndex === -1 ||
                rightVisibleIndex === -1 ||
                leftSliderIndex === -1 ||
                rightSliderIndex === -1) {
                return;
            }
            // check that they are coherent leftIndex + 1 = rightIndex in both array
            if (leftVisibleIndex + 1 !== rightVisibleIndex) {
                return;
            }
            if (leftSliderIndex + 1 !== rightSliderIndex) {
                return;
            }
            // Switch on global
            parallelPlot.dimensions[leftSliderIndex] = rightDim;
            parallelPlot.dimensions[rightSliderIndex] = leftDim;
            // Switch on Visible
            parallelPlot.visibleDimensions[leftVisibleIndex] = rightDim;
            parallelPlot.visibleDimensions[rightVisibleIndex] = leftDim;
            // Reset of the XScale
            parallelPlot.updateXScale();
            // Move only the second dimension switched
            dimensionGroup.filter(dim => (dim === rightDim || dim === leftDim) &&
                dim !== thisColumnHeaders.dragDimension)
                .transition()
                .ease(d3.easeBackOut)
                .duration(pp.ParallelPlot.D3_TRANSITION_DURATION)
                .attr("transform", function (d) {
                const x = parallelPlot.xScaleVisibleDimension(d);
                const yRefRowOffset = parallelPlot.yRefRowOffset(d);
                return `translate(${x}, ${yRefRowOffset})`;
            });
        }
        // eslint-disable-next-line max-lines-per-function
        reverseDomainOnAxis(revDim) {
            const dimensionGroup = this.dimensionGroup;
            const parallelPlot = this.parallelPlot;
            const reversedColumn = parallelPlot.columns[revDim];
            // If not continuous axis, no reverse
            if (reversedColumn.continuous === null) {
                return;
            }
            parallelPlot.updateColumnLabels();
            // Have the old scale in order to do some reverse operation
            const [old1, old2] = reversedColumn.continuous.y().domain();
            const oldScale = d3.scaleLinear()
                .range(reversedColumn.continuous.y().range())
                .domain([old2, old1]);
            const axis = d3.axisLeft(reversedColumn.continuous.y())
                .tickFormat(pp.ExpFormat.format);
            dimensionGroup.filter(dim => dim === revDim)
                .each(function () {
                d3.select(this).selectAll(".axisGroup")
                    .transition()
                    .ease(d3.easeBackOut)
                    .duration(pp.ParallelPlot.D3_TRANSITION_DURATION)
                    // @ts-ignore
                    .call(axis);
            });
            // cannot filter the dimension group
            // we need the i argument in order to find the brush
            dimensionGroup.filter(dim => dim === revDim)
                // eslint-disable-next-line max-lines-per-function
                .each(function (dim) {
                // The group can be moved by the reverse if the center lane is defined
                d3.select(this)
                    .transition()
                    .ease(d3.easeBackOut)
                    .duration(pp.ParallelPlot.D3_TRANSITION_DURATION)
                    .attr("transform", function () {
                    const x = parallelPlot.xScaleVisibleDimension(revDim);
                    const yRefRowOffset = parallelPlot.yRefRowOffset(dim);
                    return `translate(${x}, ${yRefRowOffset})`;
                });
                // Reverse Main histo Bins of the group
                d3.select(this)
                    .selectAll(".barMainHisto")
                    .transition()
                    .ease(d3.easeBackOut)
                    .duration(pp.ParallelPlot.D3_TRANSITION_DURATION)
                    .attr("transform", function (bin) {
                    if (typeof bin.x0 === "undefined" || typeof bin.x1 === "undefined") {
                        console.error("bin.x1 is undefined");
                        return null;
                    }
                    return ("translate(0," +
                        Math.min(reversedColumn.continuous.y()(bin.x1), reversedColumn.continuous.y()(bin.x0)) + ")");
                })
                    .attr("height", function (bin) {
                    if (typeof bin.x0 === "undefined" || typeof bin.x1 === "undefined") {
                        console.error("bin.x0 or bin.x1 are undefined");
                        return null;
                    }
                    return Math.abs(reversedColumn.continuous.y()(bin.x0) -
                        reversedColumn.continuous.y()(bin.x1));
                });
                // Reverse Second Histo Bins
                d3.select(this)
                    .selectAll(".barSecondHisto")
                    .transition()
                    .ease(d3.easeBackOut)
                    .duration(pp.ParallelPlot.D3_TRANSITION_DURATION)
                    .attr("transform", function (bin) {
                    if (typeof bin.x0 === "undefined" || typeof bin.x1 === "undefined") {
                        console.error("bin.x1 is undefined");
                        return null;
                    }
                    return ("translate(0," +
                        Math.min(reversedColumn.continuous.y()(bin.x1), reversedColumn.continuous.y()(bin.x0)) + ")");
                })
                    .attr("height", function (bin) {
                    if (typeof bin.x0 === "undefined" || typeof bin.x1 === "undefined") {
                        console.error("bin.x0 or bin.x1 are undefined");
                        return null;
                    }
                    return Math.abs(reversedColumn.continuous.y()(bin.x0) -
                        reversedColumn.continuous.y()(bin.x1));
                });
                // Reverse the brush
                const allDimensions = d3.keys(parallelPlot.sampleData[0]);
                const colIndex = allDimensions.indexOf(dim);
                d3.select(this)
                    .selectAll("." + pp.MultiBrush.multiBrushClass(colIndex))
                    .selectAll(".brush")
                    .each(function () {
                    const brushGroup = d3.select(this);
                    const brushSelection = d3.brushSelection(brushGroup.node());
                    if (brushSelection) {
                        const reversedBrushSelection = [
                            reversedColumn.continuous.y()(oldScale.invert(brushSelection[0])),
                            reversedColumn.continuous.y()(oldScale.invert(brushSelection[1]))
                        ].sort((a, b) => a - b);
                        // Modify the brush selection
                        brushGroup
                            .transition()
                            .ease(d3.easeBackOut)
                            .duration(pp.ParallelPlot.D3_TRANSITION_DURATION)
                            // @ts-ignore
                            .call(d3.brushY().move, reversedBrushSelection); // [selection[1] as number, selection[0] as number])
                    }
                });
                // Reverse the color Scale if it is on the same group
                d3.select(this)
                    .selectAll(".colorScaleBar")
                    .transition()
                    .duration(pp.ParallelPlot.D3_TRANSITION_DURATION)
                    .style("fill", function (pixel) {
                    return parallelPlot.valueColor(reversedColumn.continuous.y().invert(pixel));
                });
            });
        }
    }
    pp.ColumnHeaders = ColumnHeaders;
})(pp || (pp = {}));
// eslint-disable-next-line no-unused-vars
var pp;
(function (pp) {
    class Continuous {
        constructor(column, invertedAxe) {
            this.continuousMin = undefined;
            this.continuousMax = undefined;
            this.contCutoffs = null;
            this.column = column;
            this.invertedAxe = invertedAxe;
            this.yScale = d3.scaleLinear();
            this.histoGenerator = d3.histogram();
            this.histoScale = d3.scaleLinear();
            this.multiBrush = null;
            this.initDone = false;
        }
        checkInitDone() {
            if (!this.initDone) {
                this.initYScaleAndHisto();
                this.initDone = true;
            }
        }
        initYScaleAndHisto() {
            const columnDim = this.column.dim;
            const parallelPlot = this.column.parallelPlot;
            [this.continuousMin, this.continuousMax] = d3.extent(parallelPlot.sampleData, function (row) {
                return +row[columnDim];
            });
            if (typeof this.continuousMin === "undefined" || typeof this.continuousMax === "undefined") {
                console.trace("d3.extent returns 'undefined values'");
                return;
            }
            this.yScale
                .domain(this.invertedAxe
                ? [this.continuousMax, this.continuousMin]
                : [this.continuousMin, this.continuousMax])
                .range([parallelPlot.axeHeight, 0])
                .nice(this.numbin());
            this.histoGenerator
                .value(function (row) {
                return row[columnDim];
            })
                .domain([this.continuousMin, this.continuousMax])
                .thresholds(this.equiDepthThresholds(this.continuousMin, this.continuousMax));
        }
        equiDepthThresholds(min, max) {
            const binBounds = [];
            const depth = (max - min) / this.numbin();
            for (let j = 0; j < this.numbin(); j++) {
                binBounds.push(min + j * depth);
            }
            return binBounds;
        }
        numbin() {
            const parallelPlot = this.column.parallelPlot;
            return Math.ceil(2.5 * Math.pow(parallelPlot.sampleData.length, 0.25));
        }
        y() {
            this.checkInitDone();
            return this.yScale;
        }
        yTraceValue(rowIndex) {
            const columnDim = this.column.dim;
            const parallelPlot = this.column.parallelPlot;
            const value = parallelPlot.sampleData[rowIndex][columnDim];
            return this.y()(value);
        }
        histo() {
            this.checkInitDone();
            return this.histoGenerator;
        }
        setInvertedAxe(invertedAxe) {
            if (this.invertedAxe !== invertedAxe) {
                this.invertedAxe = invertedAxe;
                if (this.initDone && typeof this.continuousMin !== "undefined" && typeof this.continuousMax !== "undefined") {
                    this.yScale
                        .domain(this.invertedAxe
                        ? [this.continuousMax, this.continuousMin]
                        : [this.continuousMin, this.continuousMax])
                        .nice(this.numbin());
                }
                return true;
            }
            return false;
        }
        // eslint-disable-next-line max-lines-per-function
        drawMainHistogram() {
            const thisContinuous = this;
            const columnDim = this.column.dim;
            const parallelPlot = this.column.parallelPlot;
            const dimensionGroup = d3.selectAll(parallelPlot.bindto + " .plotGroup .dimension")
                .filter(dim => dim === columnDim);
            dimensionGroup.select(".histogram").remove();
            if (!this.column.histoVisible) {
                return;
            }
            const histogramGroup = dimensionGroup.append("g")
                .attr("class", "histogram")
                .attr("opacity", "0.5")
                .style("display", function () {
                return parallelPlot.selectedRows.size > parallelPlot.sampleData.length / 10.0
                    ? null
                    : "none";
            });
            const columnWidth = parallelPlot.xScaleVisibleDimension(parallelPlot.visibleDimensions[0]);
            if (typeof columnWidth === "undefined") {
                console.error("Dim '", parallelPlot.visibleDimensions[0], "' not found");
                return;
            }
            const bins = thisContinuous.histo()(parallelPlot.sampleData);
            const maxBinLength = d3.max(bins.map(b => b.length));
            if (typeof maxBinLength === "undefined") {
                console.error("maxBinLength not found");
                return;
            }
            // range is 70% percent of the original x() size between 2 dimensions
            this.histoScale
                .range([0, columnWidth * 0.7])
                .domain([0, maxBinLength]);
            histogramGroup.selectAll("rect")
                .data(bins)
                .enter().append("rect")
                .attr("class", "barMainHisto")
                .attr("pointer-events", "none")
                .attr("x", 2)
                .attr("transform", function (bin) {
                if (typeof bin.x0 === "undefined" || typeof bin.x1 === "undefined") {
                    console.error("bin.x1 is undefined");
                    return null;
                }
                return ("translate(0," +
                    Math.min(thisContinuous.y()(bin.x1), thisContinuous.y()(bin.x0)) + ")");
            })
                .attr("width", function (bin) {
                return thisContinuous.histoScale(bin.length);
            })
                .attr("height", function (bin) {
                if (typeof bin.x0 === "undefined" || typeof bin.x1 === "undefined") {
                    console.error("bin.x0 or bin.x1 are undefined");
                    return null;
                }
                return Math.abs(thisContinuous.y()(bin.x0) - thisContinuous.y()(bin.x1));
            })
                .style("fill", pp.ParallelPlot.mainHistoColor)
                .style("stroke", "white");
        }
        // eslint-disable-next-line max-lines-per-function
        drawSelectedHistogram(selected) {
            const thisContinuous = this;
            const columnDim = this.column.dim;
            const parallelPlot = this.column.parallelPlot;
            const dimensionGroup = d3.selectAll(parallelPlot.bindto + " .plotGroup .dimension")
                .filter(dim => dim === columnDim);
            dimensionGroup.select(".histogramSelected").remove();
            if (!this.column.histoVisible) {
                return;
            }
            const histogramGroup = dimensionGroup.append("g")
                .attr("class", "histogramSelected")
                .attr("opacity", "0.4");
            const bins = this.histo()(selected);
            let selectedHistoScale;
            if (selected.length > parallelPlot.sampleData.length / 10.0) {
                selectedHistoScale = this.histoScale;
            }
            else {
                const columnWidth = parallelPlot.xScaleVisibleDimension(parallelPlot.visibleDimensions[0]);
                if (typeof columnWidth === "undefined") {
                    console.error("Dim '", parallelPlot.visibleDimensions[0], "' not found");
                    return;
                }
                const maxBinLength = d3.max(bins.map(b => b.length));
                if (typeof maxBinLength === "undefined") {
                    console.error("maxBinLength not found");
                    return;
                }
                selectedHistoScale = d3.scaleLinear()
                    .range([0, columnWidth * 0.7])
                    .domain([0, maxBinLength]);
            }
            histogramGroup.selectAll("rect")
                .data(bins)
                .enter().append("rect")
                .attr("class", "barSecondHisto")
                .attr("pointer-events", "none")
                .attr("x", 2)
                .attr("transform", function (bin) {
                if (typeof bin.x0 === "undefined" || typeof bin.x1 === "undefined") {
                    console.error("bin.x1 is undefined");
                    return null;
                }
                return ("translate(0," +
                    Math.min(thisContinuous.y()(bin.x1), thisContinuous.y()(bin.x0)) + ")");
            })
                .attr("height", function (bin) {
                if (typeof bin.x0 === "undefined" || typeof bin.x1 === "undefined") {
                    console.error("bin.x0 or bin.x1 are undefined");
                    return null;
                }
                return Math.abs(thisContinuous.y()(bin.x0) - thisContinuous.y()(bin.x1));
            })
                .attr("width", function (bin) {
                return selectedHistoScale.domain()[1] === 0
                    ? 0
                    : selectedHistoScale(bin.length);
            })
                .style("fill", pp.ParallelPlot.secondHistoColor)
                .style("stroke", function () {
                return "white";
            });
        }
        getCutoffs() {
            return this.contCutoffs;
        }
        setCutoffs(cutoffs) {
            if (cutoffs) {
                if (typeof cutoffs[0] === "string" || typeof cutoffs[0] === "number") {
                    console.error("categories is null but categorical cutoffs are provided:", cutoffs);
                }
                else {
                    this.contCutoffs = cutoffs.map(co => {
                        // reverse order
                        return co.sort(function (a, b) {
                            return b - a;
                        });
                    });
                }
            }
            else {
                this.contCutoffs = null;
            }
        }
        hasFilters() {
            return this.contCutoffs !== null;
        }
        isKept(value) {
            if (this.contCutoffs !== null) {
                let active = false;
                this.contCutoffs.forEach(function (contCutoff) {
                    active =
                        active ||
                            (contCutoff[1] <= value && value <= contCutoff[0]);
                });
                return active;
            }
            return true;
        }
        initMultiBrush() {
            const columnDim = this.column.dim;
            const parallelPlot = this.column.parallelPlot;
            if (this.multiBrush === null ||
                d3.select(parallelPlot.bindto + " ." + pp.MultiBrush.multiBrushClass(this.column.colIndex))
                    .selectAll(".brush")
                    .size() === 0) {
                this.multiBrush = new pp.MultiBrush(this.column.colIndex, parallelPlot, columnDim);
            }
            this.multiBrush.initFrom(this.contCutoffs);
        }
        drawAxe() {
            const axis = d3.axisLeft(this.y())
                .tickFormat(pp.ExpFormat.format);
            const columnDim = this.column.dim;
            const parallelPlot = this.column.parallelPlot;
            const axisGroup = d3.selectAll(parallelPlot.bindto + " .axisGroup")
                .filter(dim => dim === columnDim);
            axisGroup.call(axis.scale(this.y()));
        }
        drawColorScale() {
            const thisContinuous = this;
            const columnDim = this.column.dim;
            const parallelPlot = this.column.parallelPlot;
            const dimensionGroup = d3.selectAll(parallelPlot.bindto + " .plotGroup .dimension")
                .filter(dim => dim === columnDim);
            dimensionGroup.selectAll(".colorScaleBar")
                .data(d3.range(parallelPlot.axeHeight))
                .enter().append("rect")
                .attr("pointer-events", "none")
                .attr("class", "colorScaleBar")
                .attr("x", -4)
                .attr("y", function (_d, i) {
                return i;
            })
                .attr("height", 1)
                .attr("width", 4)
                .attr("opacity", 0.9)
                .style("fill", function (pixel) {
                return parallelPlot.valueColor(thisContinuous.y().invert(pixel));
            });
        }
    }
    pp.Continuous = Continuous;
})(pp || (pp = {}));
// eslint-disable-next-line no-unused-vars
var pp;
(function (pp) {
    class ExpFormat {
        static sToExp(siValue) {
            const siStr = /[yzafpnµmkMGTPEZY]/.exec(siValue);
            if (siStr !== null) {
                return siValue.replace(siStr[0], ExpFormat.NONBREAKING_SPACE + "E" + ExpFormat.EXP_FORMATS[siStr[0]]);
            }
            return siValue;
        }
        static format(value) {
            if (value > 1e3 || value < -1e3 || (value < 1e-3 && value > -1e-3)) {
                return ExpFormat.sToExp(ExpFormat.f2s(value));
            }
            return ExpFormat.f3f(value);
        }
    }
    ExpFormat.NONBREAKING_SPACE = String.fromCharCode(0xA0);
    ExpFormat.EXP_FORMATS = {
        "y": "-24",
        "z": "-21",
        "a": "-18",
        "f": "-15",
        "p": "-12",
        "n": "-9",
        "µ": "-6",
        "m": "-3",
        "k": "3",
        "M": "6",
        "G": "9",
        "T": "12",
        "P": "15",
        "E": "18",
        "Z": "21",
        "Y": "24"
    };
    ExpFormat.f2s = d3.format("~s");
    ExpFormat.f3f = d3.format("~r");
    pp.ExpFormat = ExpFormat;
})(pp || (pp = {}));
// eslint-disable-next-line no-unused-vars
var pp;
(function (pp) {
    class MultiBrush {
        constructor(colIndex, plot, dim) {
            // Keep the actual d3-brush functions and their IDs in a list
            this.brushDefList = [];
            this.colIndex = colIndex;
            this.plot = plot;
            this.dim = dim;
            // Add new empty BrushDef
            this.addNewBrushDef();
            this.applyDataJoin();
        }
        static multiBrushClass(colIndex) {
            return "multibrush_col" + colIndex;
        }
        static brushClass(colIndex, brushDef) {
            return "brush" + brushDef.id + "_col" + colIndex;
        }
        brushClass(brushDef) {
            return MultiBrush.brushClass(this.colIndex, brushDef);
        }
        addNewBrushDef(initialCutoff) {
            const thisMB = this;
            const brush = d3.brushY()
                .handleSize(4)
                // Set brushable area
                .extent([
                [-5, 0],
                [20, this.plot.axeHeight]
            ])
                // When the brush moves (such as on mousemove), update cutoffs of parallelPlot
                .on("brush", function () { thisMB.updatePlotCutoffs(false); })
                // At the end of a brush gesture (such as on mouseup), update cutoffs of parallelPlot and 'brushDefList'
                .on("end", function () {
                thisMB.updatePlotCutoffs(true);
                thisMB.updateBrushDefList();
            });
            const newBrushDef = {
                id: this.brushDefList.length,
                brush: brush,
                initialCutoff: initialCutoff
            };
            this.brushDefList.push(newBrushDef);
            return newBrushDef;
        }
        applyDataJoin() {
            const thisMB = this;
            const brushGroup = d3.select(thisMB.plot.bindto + " ." + MultiBrush.multiBrushClass(this.colIndex))
                .selectAll(".brush")
                .data(this.brushDefList, brushDef => brushDef.id.toString());
            // Set up a new BrushBehavior for each entering Brush
            brushGroup.enter().insert("g", ".brush")
                .attr("class", function (brushDef) {
                return ["brush", thisMB.brushClass(brushDef)].join(" ");
            })
                .each(function (brushDef) {
                d3.select(this).call(brushDef.brush);
                // if entering Brush has an initialCutoff, modify BrushBehavior selection
                if (brushDef.initialCutoff) {
                    if (!thisMB.plot.columns[thisMB.dim].continuous) {
                        throw new Error("'initialCutoff' failed for:" + thisMB.dim);
                    }
                    const brushSelection = brushDef.initialCutoff.map(thisMB.plot.columns[thisMB.dim].continuous.y())
                        .sort((a, b) => a - b);
                    // Modify the brush selection
                    d3.select(this).call(d3.brushY().move, brushSelection);
                }
            });
            brushGroup.each(function (brushDef) {
                d3.select(this)
                    .selectAll(".overlay")
                    .style("pointer-events", function () {
                    return (brushDef.id === thisMB.brushDefList.length - 1
                        && brushDef.brush !== undefined)
                        ? "all"
                        : "none";
                })
                    .on("click", function () {
                    thisMB.removeBrushes();
                });
            });
            brushGroup.exit().remove();
        }
        removeBrushes() {
            const brushSelections = [];
            this.plot.setContCutoff(brushSelections, this.dim, true);
            // Remove all brushes
            this.brushDefList = [];
            this.applyDataJoin();
            // Add new empty BrushDef
            this.addNewBrushDef();
            this.applyDataJoin();
        }
        initFrom(cutoffs) {
            const thisMB = this;
            // Remove all Brushes
            thisMB.brushDefList = [];
            thisMB.applyDataJoin();
            if (cutoffs !== null) {
                // Add a new BrushDef for each given cutoffs
                cutoffs.forEach((cutoff) => {
                    thisMB.addNewBrushDef(cutoff);
                    thisMB.applyDataJoin();
                });
            }
            // Add new empty BrushDef
            thisMB.addNewBrushDef();
            thisMB.applyDataJoin();
        }
        updatePlotCutoffs(end) {
            const thisMB = this;
            const brushSelections = [];
            this.brushDefList.forEach(brushDef => {
                const brushGroup = d3.select(thisMB.plot.bindto + " ." + this.brushClass(brushDef));
                const brushSelection = d3.brushSelection(brushGroup.node());
                if (brushSelection !== null) {
                    brushSelections.push(brushSelection.sort((a, b) => a - b));
                }
            });
            this.plot.setContCutoff(brushSelections, this.dim, end);
        }
        updateBrushDefList() {
            // If our latest brush has a selection, that means we need to add a new empty BrushDef
            const lastBrushDef = this.brushDefList[this.brushDefList.length - 1];
            const lastBrushGroup = d3.select(this.plot.bindto + " ." + this.brushClass(lastBrushDef));
            const lastBrushSelection = d3.brushSelection(lastBrushGroup.node());
            if (lastBrushSelection && lastBrushSelection[0] !== lastBrushSelection[1]) {
                this.addNewBrushDef();
            }
            // Always draw brushes
            this.applyDataJoin();
        }
    }
    pp.MultiBrush = MultiBrush;
})(pp || (pp = {}));
// eslint-disable-next-line no-unused-vars
var pp;
(function (pp) {
    class ParallelPlot {
        constructor(id, width, height) {
            this.width = 0;
            this.height = 0;
            this.changeColorDuration = 1000;
            this.axeHeight = 0;
            this.rowLabels = null;
            this.sampleData = [];
            this.dimensions = [];
            this.defaultVisibleDimCount = 0;
            this.visibleDimCount = 0;
            this.startingDimIndex = 0;
            this.visibleDimensions = [];
            this.selectedRows = new Set();
            this.continuousCsId = ParallelPlot.CONTINUOUS_CS_IDS[0];
            this.categoricalCsId = ParallelPlot.CATEGORIAL_CS_IDS[0];
            this.refColumnDim = null;
            this.colorScale = null;
            this.columns = {}; // Column for each dimension
            this.editedRowIndex = null;
            this.editedPointDim = null;
            this.editionMode = ParallelPlot.EDITION_ON_DRAG_END;
            /**
             * Position of each dimension in X in the drawing domain
             */
            this.xScaleVisibleDimension = d3.scalePoint();
            this.refRowIndex = null;
            this.dispatch = d3.dispatch(ParallelPlot.PLOT_EVENT);
            this.rotateTitle = false;
            this.catSpreaderMap = new Map();
            this.columnHeaders = null;
            this.catEquallySpacedLines = true;
            this.arrangeMethod = ParallelPlot.ARRANGE_METHODS[1];
            this.bindto = "#" + id;
            this.style = new pp.Style(this.bindto);
            this.width = width ? width : 1200;
            this.height = height ? height : 600;
        }
        id() {
            return this.bindto.substring(1);
        }
        resize(width, height) {
            this.width = width ? width : 1200;
            this.height = height ? height : 600;
            d3.select(this.bindto + " svg")
                .attr("width", this.width)
                .attr("height", this.height);
            this.updateXScale();
            d3.select(this.bindto + " .slider .axisGroup").remove();
            d3.select(this.bindto + " .slider .brushDim").remove();
            new pp.BrushSlider(this);
            this.buildPlotArea();
            this.style.applyCssRules();
        }
        initSliderPosition(config) {
            if (config.sliderPosition) {
                if (typeof config.sliderPosition.dimCount !== "number"
                    || config.sliderPosition.dimCount > ParallelPlot.MAX_VISIBLE_DIMS) {
                    config.sliderPosition.dimCount = ParallelPlot.DEFAULT_SLIDER_POSITION.dimCount;
                }
                if (typeof config.sliderPosition.startingDimIndex !== "number") {
                    config.sliderPosition.startingDimIndex = ParallelPlot.DEFAULT_SLIDER_POSITION.startingDimIndex;
                }
            }
            else {
                config.sliderPosition = ParallelPlot.DEFAULT_SLIDER_POSITION;
            }
            this.defaultVisibleDimCount = config.sliderPosition.dimCount;
            if (this.dimensions.length < this.defaultVisibleDimCount) {
                this.visibleDimCount = this.dimensions.length;
            }
            else {
                this.visibleDimCount = this.defaultVisibleDimCount;
            }
            if (config.sliderPosition.startingDimIndex > this.dimensions.length - this.visibleDimCount) {
                this.startingDimIndex = this.dimensions.length - this.visibleDimCount;
            }
            else {
                this.startingDimIndex = config.sliderPosition.startingDimIndex;
            }
        }
        // eslint-disable-next-line max-lines-per-function
        generate(config) {
            if (d3.select(this.bindto).empty()) {
                throw new Error("'bindto' dom element not found:" + this.bindto);
            }
            this.style.cssRules = config.cssRules;
            d3.select(this.bindto).classed("parallelPlot", true);
            this.checkConfig(config);
            this.rowLabels = config.rowLabels;
            this.catEquallySpacedLines = config.categoriesRep === ParallelPlot.CATEGORIES_REP_LIST[0];
            this.arrangeMethod = config.arrangeMethod ? config.arrangeMethod : ParallelPlot.ARRANGE_FROM_RIGHT;
            this.initSampleData(config);
            this.axeHeight =
                this.height - ParallelPlot.margin.top - ParallelPlot.margin.bottom;
            if (this.refRowIndex !== null) {
                this.axeHeight = this.axeHeight / 2;
            }
            this.rotateTitle = config.rotateTitle
                ? config.rotateTitle
                : false;
            const allDimensions = d3.keys(this.sampleData[0]);
            allDimensions.forEach((dim, i) => {
                const isInput = Array.isArray(config.inputColumns)
                    ? config.inputColumns[i]
                    : true;
                const label = Array.isArray(config.columnLabels)
                    ? config.columnLabels[i]
                    : dim;
                const categories = Array.isArray(config.categorical)
                    ? config.categorical[i]
                    : null;
                const cutoffs = Array.isArray(config.cutoffs)
                    ? config.cutoffs[i]
                    : null;
                const histoVisibility = Array.isArray(config.histoVisibility)
                    ? config.histoVisibility[i]
                    : false;
                const invertedAxis = Array.isArray(config.invertedAxes)
                    ? config.invertedAxes[i]
                    : false;
                this.columns[dim] = new pp.Column(dim, i, this, label, categories, cutoffs, histoVisibility, invertedAxis, isInput ? pp.Column.INPUT : pp.Column.OUTPUT);
            });
            const nanColumns = allDimensions.map(dim => this.sampleData.every(row => isNaN(row[dim])));
            this.dimensions = allDimensions.filter((_dim, i) => !(nanColumns[i] || (Array.isArray(config.keptColumns) && !config.keptColumns[i])));
            if (!config.refColumnDim) {
                this.refColumnDim = null;
            }
            else if (this.dimensions.includes(config.refColumnDim)) {
                this.refColumnDim = config.refColumnDim;
            }
            else {
                console.error("Unknown 'refColumnDim': " + config.refColumnDim);
            }
            this.updateSelectedRows();
            this.initSliderPosition(config);
            if (!config.continuousCS) {
                this.continuousCsId = ParallelPlot.CONTINUOUS_CS_IDS[0];
            }
            else if (ParallelPlot.CONTINUOUS_CS_IDS.includes(config.continuousCS)) {
                this.continuousCsId = config.continuousCS;
            }
            else {
                console.error("Unknown continuous color scale: " + config.continuousCS);
            }
            if (!config.categoricalCS) {
                this.categoricalCsId = ParallelPlot.CATEGORIAL_CS_IDS[0];
            }
            else if (ParallelPlot.CATEGORIAL_CS_IDS.includes(config.categoricalCS)) {
                this.categoricalCsId = config.categoricalCS;
            }
            else {
                console.error("Unknown categorical color scale: " + config.categoricalCS);
            }
            if (!config.editionMode) {
                this.editionMode = ParallelPlot.EDITION_OFF;
            }
            else if (ParallelPlot.EDITION_MODE_IDS.includes(config.editionMode)) {
                this.editionMode = config.editionMode;
            }
            else {
                console.error("Unknown edition mode: " + config.editionMode);
            }
            d3.select(this.bindto).style("position", "relative");
            d3.select(this.bindto).selectAll("div").remove();
            const controlWidgets = config.controlWidgets ? config.controlWidgets : false;
            d3.select(this.bindto).append("div")
                .attr("class", "ppDiv")
                .classed("withWidgets", controlWidgets)
                .classed("withoutWidgets", !controlWidgets);
            this.appendControlDiv();
            this.appendPlotSvg();
            this.initTraceTooltip();
            this.appendContCsSelect();
            this.appendCatCsSelect();
            this.appendZAxisSelector();
            this.initZAxisUsedCB();
            this.appendCatRepSelect();
            this.appendArrangeMethodSelect();
            this.style.applyCssRules();
        }
        appendControlDiv() {
            const ppDiv = d3.select(this.bindto + " .ppDiv");
            const controlDiv = ppDiv.append("div").attr("class", "controlDiv");
            const csDiv = controlDiv.append("div")
                .attr("class", "csDiv");
            csDiv.append("div")
                .attr("class", "zAxisUsedDiv")
                .html(`<input type="checkbox" id="${this.id()}_zAxisUsed" name="zAxisUsed" checked> <label for="${this.id()}_zAxisUsed">Use Z Axis</label> <span class="ParamSelect ZAxis"></span>`);
            csDiv.append("div")
                .html("Continuous Color Scale: <span class=\"contCsSelect\"></span>");
            csDiv.append("div")
                .html("Categorical Color Scale: <span class=\"catCsSelect\"></span>");
            const catDiv = controlDiv.append("div")
                .attr("class", "catDiv");
            catDiv.append("div")
                .html("Categories Representation: <span class=\"catRepSelect\"></span>");
            catDiv.append("div")
                .html("Arrange Method in Category Boxes: <span class=\"arrangeMethodSelect\"></span>");
        }
        appendContCsSelect() {
            const thisPPlot = this;
            d3.select(this.bindto + " .contCsSelect").append("select")
                .on("change", function () {
                const contCsKey = ParallelPlot.CONTINUOUS_CS_IDS[this.selectedIndex];
                thisPPlot.setContinuousColorScale(contCsKey);
            })
                .selectAll("option")
                .data(ParallelPlot.CONTINUOUS_CS_IDS)
                .enter().append("option")
                .text(function (d) { return d; })
                .attr("value", function (d) { return d; });
            const contCsIndex = ParallelPlot.CONTINUOUS_CS_IDS.indexOf(this.continuousCsId);
            d3.select(this.bindto + " .contCsSelect > select")
                .property("selectedIndex", contCsIndex);
        }
        appendCatCsSelect() {
            const thisPPlot = this;
            d3.select(this.bindto + " .catCsSelect").append("select")
                .on("change", function () {
                const catCsKey = ParallelPlot.CATEGORIAL_CS_IDS[this.selectedIndex];
                thisPPlot.setCategoricalColorScale(catCsKey);
            })
                .selectAll("option")
                .data(ParallelPlot.CATEGORIAL_CS_IDS)
                .enter().append("option")
                .text(function (d) { return d; })
                .attr("value", function (d) { return d; });
            const catCsIndex = ParallelPlot.CATEGORIAL_CS_IDS.indexOf(this.categoricalCsId);
            d3.select(this.bindto + " .catCsSelect > select")
                .property("selectedIndex", catCsIndex);
        }
        appendZAxisSelector() {
            const thisPPlot = this;
            d3.select(this.bindto + " .ParamSelect.ZAxis")
                .append("select")
                .on("change", function () {
                thisPPlot.changeColorMapOnDimension(thisPPlot.dimensions[this.selectedIndex]);
            })
                .selectAll("option")
                .data(this.dimensions)
                .enter().append("option")
                .text(function (d) { return d; })
                .attr("value", function (d) { return d; });
            if (this.refColumnDim !== null) {
                const paramIndex = this.dimensions.indexOf(this.refColumnDim);
                d3.select(this.bindto + " .ParamSelect.ZAxis > select")
                    .property("selectedIndex", paramIndex);
            }
        }
        initZAxisUsedCB() {
            d3.select(`#${this.id()}_zAxisUsed`)
                .property("checked", this.refColumnDim !== null)
                .on("change", ParallelPlot.prototype.updateZAxisFromGui.bind(this));
        }
        updateZAxisFromGui() {
            if (d3.select(`#${this.id()}_zAxisUsed`).property("checked")) {
                const zAxisSelectNode = d3.select(this.bindto + " .ParamSelect.ZAxis>select").node();
                if (zAxisSelectNode) {
                    this.refColumnDim = this.dimensions[zAxisSelectNode.selectedIndex];
                    this.changeColorMap();
                }
            }
            else {
                this.refColumnDim = null;
                this.changeColorMap();
            }
        }
        appendCatRepSelect() {
            const thisPPlot = this;
            d3.select(this.bindto + " .catRepSelect").append("select")
                .on("change", function () {
                const catRep = ParallelPlot.CATEGORIES_REP_LIST[this.selectedIndex];
                thisPPlot.setCategoriesRep(catRep);
            })
                .selectAll("option")
                .data(ParallelPlot.CATEGORIES_REP_LIST)
                .enter().append("option")
                .text(function (d) { return d; })
                .attr("value", function (d) { return d; });
            const catRep = this.catEquallySpacedLines ? ParallelPlot.CATEGORIES_REP_LIST[0] : ParallelPlot.CATEGORIES_REP_LIST[1];
            const catRepIndex = ParallelPlot.CATEGORIES_REP_LIST.indexOf(catRep);
            d3.select(this.bindto + " .catRepSelect > select")
                .property("selectedIndex", catRepIndex);
        }
        appendArrangeMethodSelect() {
            const thisPPlot = this;
            d3.select(this.bindto + " .arrangeMethodSelect").append("select")
                .on("change", function () {
                const arrangeMethod = ParallelPlot.ARRANGE_METHODS[this.selectedIndex];
                thisPPlot.setArrangeMethod(arrangeMethod);
            })
                .selectAll("option")
                .data(ParallelPlot.ARRANGE_METHODS)
                .enter().append("option")
                .text(function (d) { return d; })
                .attr("value", function (d) { return d; });
            const arrangeMethodIndex = ParallelPlot.ARRANGE_METHODS.indexOf(this.arrangeMethod);
            d3.select(this.bindto + " .arrangeMethodSelect > select")
                .property("selectedIndex", arrangeMethodIndex);
        }
        // eslint-disable-next-line max-lines-per-function
        appendPlotSvg() {
            const thisPlot = this;
            const ppDiv = d3.select(this.bindto + " .ppDiv");
            const svg = ppDiv.append("svg")
                .attr("width", this.width)
                .attr("height", this.height);
            this.addGlow();
            const plotGroup = svg.append("g")
                .attr("class", "plotGroup")
                .attr("transform", "translate(" +
                ParallelPlot.margin.left + "," +
                ParallelPlot.margin.top + ")");
            this.setColorScale();
            svg.append("g")
                .attr("class", "slider")
                .attr("transform", "translate(" +
                ParallelPlot.margin.left + "," +
                ParallelPlot.margin.top / 4.0 + ")");
            // Path of the background
            plotGroup.append("g")
                .attr("class", "background")
                .attr("opacity", "0.1");
            // Path of the foreground
            plotGroup.append("g")
                .attr("class", "foreground")
                .attr("opacity", "0.8");
            plotGroup.append("g")
                .attr("class", "columns");
            this.updateVisibleDimensions();
            new pp.BrushSlider(this);
            this.buildPlotArea();
            plotGroup.append("path")
                .attr("class", "subHlTrace")
                .attr("d", this.path(0))
                .attr("stroke-width", 3)
                .attr("fill", "none")
                .attr("pointer-events", "none")
                .style("display", "none")
                .style("filter", "url(#glow)");
            plotGroup.append("path")
                .attr("class", "hlTrace")
                .attr("d", this.path(0))
                .attr("stroke-width", 2)
                .attr("fill", "none")
                .attr("pointer-events", "none")
                .style("display", "none");
            plotGroup.append("path")
                .attr("class", "subEditedTrace")
                .attr("d", this.path(0))
                .attr("stroke-width", 3)
                .attr("opacity", "0.8")
                .attr("fill", "none")
                .attr("pointer-events", "none")
                .style("display", "none")
                .style("filter", "url(#glow)");
            plotGroup.append("path")
                .attr("class", "editedTrace")
                .attr("d", this.path(0))
                .attr("opacity", "0.8")
                .attr("stroke-width", 2)
                .attr("fill", "none")
                .style("display", "none")
                .on("click", function () {
                thisPlot.editedRowIndex = null;
                thisPlot.drawEditedTrace();
            });
            plotGroup.append("g")
                .attr("class", "editionCircles")
                .style("display", "none");
            this.changeColorMap();
        }
        checkConfig(config) {
            ParallelPlot.checkData(config);
            ParallelPlot.checkCategorical(config);
            ParallelPlot.checkCategoriesRep(config);
            ParallelPlot.checkArrangeMethod(config);
            ParallelPlot.checkColumnLabels(config);
            ParallelPlot.checkInputColumns(config);
            this.checkRefRowIndex(config);
        }
        static checkData(config) {
            if (!Array.isArray(config.data)) {
                throw new Error("given dataset is not a D3 friendly (row-oriented) data");
            }
            if (config.data.length === 0) {
                throw new Error("given dataset contains no line)");
            }
            if (typeof config.data.columns === "undefined") {
                config.data.columns = d3.keys(config.data[0]);
            }
        }
        static checkCategorical(config) {
            if (config.categorical) {
                if (Array.isArray(config.categorical)) {
                    if (config.categorical.length !== config.data.columns.length) {
                        console.error("Length of 'categorical' must be equal to the number of columns of 'data'");
                        config.categorical = null;
                    }
                }
                else {
                    console.error("'categorical' must be an array");
                    config.categorical = null;
                }
            }
        }
        static checkCategoriesRep(config) {
            if (!config.categoriesRep) {
                config.categoriesRep = ParallelPlot.CATEGORIES_REP_LIST[0];
            }
            else if (!ParallelPlot.CATEGORIES_REP_LIST.includes(config.categoriesRep)) {
                console.error("Unknown categoriesRep: " + config.categoriesRep);
            }
        }
        static checkArrangeMethod(config) {
            if (!config.arrangeMethod) {
                config.arrangeMethod = null;
            }
            else if (!ParallelPlot.ARRANGE_METHODS.includes(config.arrangeMethod)) {
                console.error("Unknown arrangeMethod: " + config.arrangeMethod);
                config.arrangeMethod = null;
            }
        }
        static checkColumnLabels(config) {
            if (config.columnLabels) {
                if (Array.isArray(config.columnLabels)) {
                    if (config.columnLabels.length !== config.data.columns.length) {
                        console.error("Length of 'columnLabels' must be equal to the number of columns of 'data'");
                        config.columnLabels = null;
                    }
                }
                else {
                    console.error("'columnLabels' must be an array");
                    config.columnLabels = null;
                }
            }
        }
        static checkInputColumns(config) {
            if (config.inputColumns) {
                if (Array.isArray(config.inputColumns)) {
                    if (config.inputColumns.length !== config.data.columns.length) {
                        console.error("Length of 'inputColumns' must be equal to the number of columns of 'data'");
                        config.inputColumns = null;
                    }
                }
                else {
                    console.error("'inputColumns' must be an array");
                    config.inputColumns = null;
                }
            }
        }
        checkRefRowIndex(config) {
            if (typeof config.refRowIndex === "number") {
                this.refRowIndex = config.refRowIndex;
            }
            else {
                if (config.refRowIndex) {
                    console.error("'refRowIndex' must be of integer type");
                }
                this.refRowIndex = null;
            }
            if (Array.isArray(config.data)) {
                const rowCount = config.data.length;
                if (typeof this.refRowIndex === "number" && (this.refRowIndex < 0 || this.refRowIndex > rowCount)) {
                    console.error(`refRowIndex: ${this.refRowIndex} must be a valid row index, it must be in range: [1, ${rowCount - 1}]`);
                    this.refRowIndex = null;
                }
            }
        }
        addGlow() {
            const svg = d3.select(this.bindto + " svg");
            //Container for the gradients
            const defs = svg.append("defs");
            //Filter for the outside glow
            const filter = defs.append("filter").attr("id", "glow");
            filter.append("feGaussianBlur")
                .attr("stdDeviation", "3.5")
                .attr("result", "coloredBlur");
            const feMerge = filter.append("feMerge");
            feMerge.append("feMergeNode").attr("in", "coloredBlur");
            feMerge.append("feMergeNode").attr("in", "SourceGraphic");
        }
        updateXScale() {
            this.xScaleVisibleDimension
                .domain(this.visibleDimensions)
                .range([0, this.width - ParallelPlot.margin.left - ParallelPlot.margin.right])
                .padding(1);
        }
        on(type, callback) {
            // @ts-ignore
            this.dispatch.on(type, callback);
        }
        initSampleData(config) {
            const thisPlot = this;
            this.sampleData = [];
            config.data.forEach(function (r) {
                const curRow = {};
                config.data.columns.forEach((dim, i) => {
                    const categories = Array.isArray(config.categorical)
                        ? config.categorical[i]
                        : null;
                    const cellValue = r[dim];
                    if (typeof cellValue === "undefined") {
                        curRow[dim] = NaN;
                    }
                    else if (categories) {
                        let catIndex = categories.indexOf(cellValue.toString());
                        if (catIndex === -1) {
                            catIndex = categories.indexOf(+cellValue);
                        }
                        curRow[dim] = (catIndex === -1) ? NaN : catIndex;
                    }
                    else {
                        curRow[dim] = +cellValue;
                    }
                });
                thisPlot.sampleData.push(curRow);
            });
        }
        updateVisibleDimensions() {
            // Dimensions with cutoffs are Always Visible
            const withCutoffs = this.dimensions.filter(dim => this.columns[dim].hasFilters() ||
                dim === this.refColumnDim);
            // Care about slice method which dont take the end item
            const requested = this.dimensions.slice(this.startingDimIndex, this.startingDimIndex + this.visibleDimCount);
            const withCutoffsBefore = withCutoffs.filter(dim => this.dimensions.indexOf(dim) < this.startingDimIndex);
            const withCutoffsAfter = withCutoffs.filter(dim => this.dimensions.indexOf(dim) >= this.startingDimIndex + this.visibleDimCount);
            const requestedPlusWithCutoffs = withCutoffsBefore
                .concat(requested)
                .concat(withCutoffsAfter);
            // Have to remove elements in order to have the good lenght (but not elements having cutoffs)
            const withoutCutoffsRequested = requested.filter(dim => !withCutoffs.includes(dim));
            const requestedToRemoveBefore = withoutCutoffsRequested.splice(0, withCutoffsBefore.length);
            const requestedToRemoveAfter = withoutCutoffsRequested.splice(-withCutoffsAfter.length, withCutoffsAfter.length);
            this.visibleDimensions = requestedPlusWithCutoffs.filter(dim => !requestedToRemoveBefore.includes(dim) &&
                !requestedToRemoveAfter.includes(dim));
            this.updateXScale();
        }
        xCatOffset(dim) {
            return this.columns[dim].categorical !== null && this.arrangeMethod === ParallelPlot.ARRANGE_FROM_BOTH
                ? ParallelPlot.catClusterWidth / 2
                : 0;
        }
        yRefRowOffset(dim) {
            return this.refRowIndex === null
                ? 0
                : this.axeHeight - this.yTraceValue(dim, this.refRowIndex);
        }
        yTraceValue(dim, rowIndex) {
            return this.columns[dim].yTraceValue(rowIndex);
        }
        rowColor(row) {
            if (this.refColumnDim === null) {
                return "#03306B";
            }
            else {
                if (this.colorScale === null) {
                    console.error("Cant't retrieve a color for a row (no color scale defined)");
                    return "#03306B";
                }
                return this.colorScale(row[this.refColumnDim]);
            }
        }
        valueColor(value) {
            if (this.colorScale === null) {
                console.error("Cant't retrieve a color for a value (no color scale defined)");
                return "#03306B";
            }
            return this.colorScale(value);
        }
        changeColorMapOnDimension(d) {
            this.refColumnDim = (d === this.refColumnDim) ? null : d;
            this.changeColorMap();
        }
        setArrangeMethod(arrangeMethod) {
            if (ParallelPlot.ARRANGE_METHODS.includes(arrangeMethod)) {
                this.arrangeMethod = arrangeMethod;
                this.refreshTracesPaths();
            }
            else {
                console.error("Unknown arrange method: " + arrangeMethod);
            }
        }
        setCategoriesRep(categoriesRep) {
            if (ParallelPlot.CATEGORIES_REP_LIST.includes(categoriesRep)) {
                this.catEquallySpacedLines = categoriesRep === ParallelPlot.CATEGORIES_REP_LIST[0];
                this.refreshTracesPaths();
                this.refreshCategoriesBoxes();
                this.updateColumnLabels();
            }
            else {
                console.error("Unknown categories representation: " + categoriesRep);
            }
        }
        setContinuousColorScale(continuousCsId) {
            if (ParallelPlot.CONTINUOUS_CS_IDS.includes(continuousCsId)) {
                this.continuousCsId = continuousCsId;
                this.changeColorMap();
            }
            else {
                console.error("Unknown continuous color scale: " + continuousCsId);
            }
        }
        setCategoricalColorScale(categoricalCsId) {
            if (ParallelPlot.CATEGORIAL_CS_IDS.includes(categoricalCsId)) {
                this.categoricalCsId = categoricalCsId;
                this.changeColorMap();
            }
            else {
                console.error("Unknown categorical color scale: " + categoricalCsId);
            }
        }
        setHistoVisibility(histoVisibility) {
            const thisPlot = this;
            d3.keys(this.sampleData[0]).forEach(function (dim, i) {
                if (Array.isArray(histoVisibility)) {
                    thisPlot.columns[dim].histoVisible = histoVisibility[i];
                }
                else {
                    if (typeof histoVisibility[dim] === "undefined") {
                        return;
                    }
                    thisPlot.columns[dim].histoVisible = histoVisibility[dim];
                }
                thisPlot.drawMainHistograms();
                thisPlot.drawSelectedHistograms();
            });
        }
        setInvertedAxes(invertedAxes) {
            const thisPlot = this;
            d3.keys(this.sampleData[0]).forEach(function (dim, i) {
                if (Array.isArray(invertedAxes)) {
                    if (thisPlot.columns[dim].setInvertedAxe(invertedAxes[i]) && thisPlot.columnHeaders) {
                        thisPlot.columnHeaders.reverseDomainOnAxis(dim);
                    }
                }
                else {
                    if (typeof invertedAxes[dim] === "undefined") {
                        return;
                    }
                    if (thisPlot.columns[dim].setInvertedAxe(invertedAxes[dim]) && thisPlot.columnHeaders) {
                        thisPlot.columnHeaders.reverseDomainOnAxis(dim);
                    }
                }
            });
            this.refreshTracesPaths();
        }
        updateColumnLabels() {
            const parallelPlot = this;
            const dimensionGroup = d3.select(parallelPlot.bindto + " .plotGroup").selectAll(".dimension");
            const axisLabel = dimensionGroup.select(".axisLabel");
            axisLabel.each(function (dim) {
                var _a, _b;
                const self = d3.select(this);
                const invertIndicator = parallelPlot.columns[dim].continuous && ((_a = parallelPlot.columns[dim].continuous) === null || _a === void 0 ? void 0 : _a.invertedAxe)
                    ? "↓ "
                    : "";
                const hiddenCatCount = parallelPlot.catEquallySpacedLines && parallelPlot.columns[dim].categorical
                    ? (_b = parallelPlot.columns[dim].categorical) === null || _b === void 0 ? void 0 : _b.catWithoutTraces().length : 0;
                const hiddenCatIndicator = hiddenCatCount === 0
                    ? ""
                    : ` (-${hiddenCatCount})`;
                const labels = (invertIndicator + parallelPlot.columns[dim].label + hiddenCatIndicator).split("<br>");
                self.text(labels[0]);
                for (let i = 1; i < labels.length; i++) {
                    self.append("tspan")
                        .attr("x", 0)
                        .attr("dy", "1em")
                        .text(labels[i]);
                }
                if (parallelPlot.rotateTitle) {
                    self.attr("y", 0)
                        .attr("transform", "rotate(-10) translate(-20," + -15 * labels.length + ")");
                }
                else {
                    self.style("text-anchor", "middle")
                        .attr("y", -15 * labels.length);
                }
            });
        }
        refreshCategoriesBoxes() {
            Object.values(this.columns).forEach(column => {
                if (column.categorical) {
                    column.categorical.refreshBoxesRep();
                }
            });
        }
        unvalidateColumnInit() {
            Object.values(this.columns).forEach(column => {
                if (column.categorical) {
                    column.categorical.unvalidateInit();
                }
            });
        }
        refreshTracesPaths() {
            this.unvalidateColumnInit();
            this.updateTracesPaths();
            this.updateEditedTrace();
        }
        updateTracesPaths() {
            const thisPlot = this;
            this.unvalidateColumnInit();
            d3.select(thisPlot.bindto + " .foreground")
                .selectAll("path")
                .transition()
                .ease(d3.easeBackOut)
                .duration(ParallelPlot.D3_TRANSITION_DURATION)
                .attr("d", function (_d, i) {
                return thisPlot.path(i);
            });
            // Move BackGround Path
            d3.select(thisPlot.bindto + " .background")
                .selectAll("path")
                .transition()
                .ease(d3.easeBackOut)
                .duration(ParallelPlot.D3_TRANSITION_DURATION)
                .attr("d", function (_d, i) {
                return thisPlot.path(i);
            });
        }
        updateEditedTrace() {
            const thisPlot = this;
            if (thisPlot.editedRowIndex === null) {
                return;
            }
            d3.select(thisPlot.bindto + " .subEditedTrace")
                .transition()
                .ease(d3.easeBackOut)
                .duration(ParallelPlot.D3_TRANSITION_DURATION)
                .attr("d", thisPlot.path(thisPlot.editedRowIndex));
            d3.select(thisPlot.bindto + " .editedTrace")
                .transition()
                .ease(d3.easeBackOut)
                .duration(ParallelPlot.D3_TRANSITION_DURATION)
                .attr("d", thisPlot.path(thisPlot.editedRowIndex));
            d3.selectAll(thisPlot.bindto + " .gEditionCircle")
                .transition()
                .ease(d3.easeBackOut)
                .duration(ParallelPlot.D3_TRANSITION_DURATION)
                .attr("transform", function (dim) {
                const x = thisPlot.xScaleVisibleDimension(dim);
                const xCatOffset = thisPlot.xCatOffset(dim);
                const yRefRowOffset = thisPlot.yRefRowOffset(dim);
                return `translate(${x + xCatOffset}, ${yRefRowOffset})`;
            });
            d3.select(thisPlot.bindto + " .editionCircles")
                .selectAll("circle")
                .transition()
                .ease(d3.easeBackOut)
                .duration(ParallelPlot.D3_TRANSITION_DURATION)
                .attr("cy", function (dim) {
                if (thisPlot.editedRowIndex === null) {
                    return 0;
                }
                return thisPlot.yTraceValue(dim, thisPlot.editedRowIndex) + thisPlot.yRefRowOffset(dim);
            });
        }
        setCutoffs(cutoffs) {
            const thisPlot = this;
            d3.keys(this.sampleData[0]).forEach(function (dim, i) {
                if (cutoffs === null) {
                    thisPlot.columns[dim].setCutoffs(null);
                }
                else if (Array.isArray(cutoffs)) {
                    thisPlot.columns[dim].setCutoffs(cutoffs[i]);
                }
                else {
                    if (typeof cutoffs[dim] === "undefined") {
                        return;
                    }
                    thisPlot.columns[dim].setCutoffs(cutoffs[dim]);
                }
                if (thisPlot.columns[dim].continuous) {
                    thisPlot.columns[dim].continuous.initMultiBrush();
                }
                if (thisPlot.columns[dim].categorical) {
                    thisPlot.columns[dim].categorical.applyCategoricalCutoffs();
                }
            });
            thisPlot.applyColumnCutoffs();
        }
        adjustVisibleDimensions() {
            if (this.dimensions.length < this.defaultVisibleDimCount) {
                this.visibleDimCount = this.dimensions.length;
            }
            else {
                this.visibleDimCount = this.defaultVisibleDimCount;
            }
            this.startingDimIndex = 0;
            this.updateVisibleDimensions();
        }
        setKeptColumns(keptColumns) {
            const thisPlot = this;
            if (Array.isArray(keptColumns)) {
                this.dimensions = d3.keys(this.sampleData[0]).filter((_dim, i) => keptColumns[i]);
            }
            else {
                this.dimensions = d3.keys(this.sampleData[0]).filter(function (dim) {
                    let toKeep = thisPlot.dimensions.includes(dim);
                    if (typeof keptColumns[dim] !== "undefined") {
                        toKeep = keptColumns[dim];
                    }
                    return toKeep;
                });
            }
            this.adjustVisibleDimensions();
            d3.select(this.bindto + " .slider .axisGroup").remove();
            d3.select(this.bindto + " .slider .brushDim").remove();
            new pp.BrushSlider(this);
            this.buildPlotArea();
            this.style.applyCssRules();
        }
        getValue(attrType) {
            const thisPlot = this;
            if (attrType === ParallelPlot.CO_ATTR_TYPE) {
                const coMap = new Map();
                d3.keys(this.sampleData[0])
                    .forEach(function (dim) {
                    const cutoffs = thisPlot.columns[dim].getCutoffs();
                    if (cutoffs !== null) {
                        coMap.set(dim, cutoffs);
                    }
                });
                const cutoffs = {};
                for (const [dim, co] of coMap) {
                    cutoffs[dim] = co;
                }
                return cutoffs;
            }
            if (attrType === ParallelPlot.ST_ATTR_TYPE) {
                return [...this.selectedRows];
            }
            if (attrType === ParallelPlot.RC_ATTR_TYPE) {
                return this.refColumnDim;
            }
            throw new Error("'getValue' called with an unknown attrType: " + attrType);
        }
        setColorScale() {
            if (this.refColumnDim !== null) {
                if (this.columns[this.refColumnDim].continuous) {
                    const [yRefMin, yRefMax] = this.columns[this.refColumnDim].continuous.y().domain();
                    this.colorScale = d3.scaleSequential(ParallelPlot.CONTINUOUS_CS[this.continuousCsId])
                        .domain([yRefMin, yRefMax]);
                }
                if (this.columns[this.refColumnDim].categorical) {
                    const yRefMax = this.columns[this.refColumnDim].categorical.categories.length;
                    this.colorScale = ParallelPlot.CATEGORIAL_CS[this.categoricalCsId]
                        .domain(d3.range(yRefMax));
                }
            }
        }
        // eslint-disable-next-line max-lines-per-function
        changeColorMap() {
            const thisPlot = this;
            this.setColorScale();
            d3.select(this.bindto + " .foreground")
                .selectAll("path")
                .transition()
                .duration(this.changeColorDuration)
                .attr("stroke", function (row) {
                return thisPlot.rowColor(row);
            });
            d3.select(this.bindto + " .background")
                .selectAll("path")
                .transition()
                .duration(this.changeColorDuration)
                .attr("stroke", function (row) {
                return thisPlot.rowColor(row);
            });
            d3.select(this.bindto + " .plotGroup")
                .selectAll(".dimension")
                .each(function (dim) {
                if (dim === thisPlot.refColumnDim) {
                    d3.select(this).selectAll(".category rect")
                        .transition()
                        .duration(thisPlot.changeColorDuration)
                        .attr("fill", function (cat) {
                        if (thisPlot.columns[dim].categorical) {
                            const catIndex = thisPlot.columns[dim].categorical.categories.indexOf(cat);
                            return thisPlot.valueColor(catIndex);
                        }
                        throw new Error("'changeColorMap' failed for dim:" + dim);
                    });
                }
                else {
                    d3.select(this).selectAll(".category rect")
                        .transition()
                        .duration(thisPlot.changeColorDuration)
                        .attr("fill", "black");
                }
            });
            if (this.editedRowIndex !== null) {
                const stroke = thisPlot.selectedRows.has(this.editedRowIndex) ? thisPlot.rowColor(thisPlot.sampleData[this.editedRowIndex]) : "#FFFFFF";
                const greyStroke = ParallelPlot.greyStroke(stroke);
                d3.select(this.bindto + " .subEditedTrace")
                    .transition()
                    .duration(this.changeColorDuration)
                    .attr("stroke", greyStroke);
                d3.select(this.bindto + " .editedTrace")
                    .transition()
                    .duration(this.changeColorDuration)
                    .attr("stroke", stroke);
            }
            this.drawContinuousCS();
        }
        drawContinuousCS() {
            const thisPlot = this;
            d3.select(this.bindto + " .plotGroup").selectAll(".colorScaleBar").remove();
            d3.selectAll(this.bindto + " .plotGroup .dimension")
                .each(function (dim) {
                if (thisPlot.columns[dim].continuous && thisPlot.refColumnDim === thisPlot.columns[dim].dim) {
                    thisPlot.columns[dim].continuous.drawColorScale();
                }
            });
        }
        drawContinuousAxes() {
            const thisPlot = this;
            d3.select(this.bindto + " .plotGroup")
                .selectAll(".dimension").append("g")
                .attr("class", "axisGroup")
                .each(function (dim) {
                if (thisPlot.columns[dim].continuous) {
                    thisPlot.columns[dim].continuous.drawAxe();
                }
            });
        }
        drawCategoricals() {
            const thisPlot = this;
            d3.select(this.bindto + " .plotGroup")
                .selectAll(".dimension")
                .filter((dim) => thisPlot.columns[dim].categorical !== null)
                .append("g")
                .attr("class", "catGroup")
                .each(function (dim) {
                thisPlot.columns[dim].categorical.drawCategories();
            });
        }
        updateSelectedRows() {
            const thisPlot = this;
            this.selectedRows.clear();
            this.sampleData.forEach(function (row, i) {
                const isKept = thisPlot.dimensions.every(function (dim) {
                    return thisPlot.columns[dim].isKept(row[dim]);
                });
                if (isKept) {
                    thisPlot.selectedRows.add(i);
                }
            });
        }
        buildPlotArea() {
            const thisPlot = this;
            this.drawBackGroundPath();
            this.drawForeGroundPath();
            this.drawEditedTrace();
            d3.select(this.bindto + " .plotGroup").selectAll(".dimension").remove();
            // Add a group element for each dimension.
            const dimensionGroup = d3.select(this.bindto + " .columns")
                .selectAll(".dimension")
                .data(this.visibleDimensions)
                .enter().append("g")
                .classed("dimension", true)
                .classed("input", function (dim) { return thisPlot.columns[dim].isInput(); })
                .classed("output", function (dim) { return thisPlot.columns[dim].isOutput(); })
                .attr("transform", function (dim) {
                const x = thisPlot.xScaleVisibleDimension(dim);
                const yRefRowOffset = thisPlot.yRefRowOffset(dim);
                return `translate(${x}, ${yRefRowOffset})`;
            });
            this.drawContinuousAxes();
            this.drawCategoricals();
            this.drawMainHistograms();
            this.drawSelectedHistograms();
            // Add and store a multibrush for each continious axis.
            dimensionGroup.append("g")
                .filter(dim => thisPlot.columns[dim].continuous !== null)
                .attr("class", function (dim) {
                return pp.MultiBrush.multiBrushClass(thisPlot.columns[dim].colIndex);
            })
                .each(function (dim) {
                thisPlot.columns[dim].continuous.initMultiBrush();
            });
            this.columnHeaders = new pp.ColumnHeaders(this);
            this.drawContinuousCS();
        }
        drawBackGroundPath() {
            const thisPlot = this;
            d3.select(this.bindto + " .background").selectAll("path").remove();
            d3.select(this.bindto + " .background").selectAll("path")
                .data(this.sampleData)
                .enter().append("path")
                .attr("d", function (_row, i) {
                return thisPlot.path(i);
            })
                .attr("stroke", function (row) {
                return thisPlot.rowColor(row);
            })
                .style("display", function (_row, i) {
                return thisPlot.selectedRows.has(i) ? "none" : null;
            });
        }
        drawForeGroundPath() {
            const thisPlot = this;
            d3.select(this.bindto + " .foreground").selectAll("path").remove();
            d3.select(this.bindto + " .foreground")
                .selectAll("path")
                .data(this.sampleData)
                .enter().append("path")
                .attr("d", function (_row, i) {
                return thisPlot.path(i);
            })
                .attr("stroke", function (row) {
                return thisPlot.rowColor(row);
            })
                .attr("stroke-width", 1)
                .style("display", function (_row, i) {
                return thisPlot.selectedRows.has(i) ? null : "none";
            })
                .on("mouseover", function (row, i) {
                thisPlot.drawHighlightedTrace(i);
                thisPlot.showTraceTooltip(row, i, thisPlot.traceTooltipLocation());
            })
                .on("mouseout", function () {
                thisPlot.drawHighlightedTrace(null);
                d3.select(thisPlot.bindto + " .ppTooltip").style("display", "none");
            })
                .on("click", function (_clickedRow, clickedRowIndex) {
                if (thisPlot.editionMode !== ParallelPlot.EDITION_OFF) {
                    thisPlot.editedRowIndex =
                        thisPlot.editedRowIndex === clickedRowIndex
                            ? null
                            : clickedRowIndex;
                    thisPlot.drawEditedTrace();
                }
            });
        }
        path(rowIndex) {
            // Each visible categorical needs an additional node (to allow 'both' arrange method)
            let nodeCount = this.visibleDimensions.length;
            this.visibleDimensions.forEach(dim => {
                if (this.columns[dim].categorical !== null) {
                    nodeCount = nodeCount + 1;
                }
            });
            const lineData = new Array(nodeCount);
            let nodeIndex = 0;
            this.visibleDimensions.forEach(dim => {
                const x = this.xScaleVisibleDimension(dim);
                const xCatOffset = this.xCatOffset(dim);
                const y = this.yTraceValue(dim, rowIndex);
                const yRefRowOffset = this.yRefRowOffset(dim);
                lineData[nodeIndex] = [x - xCatOffset, y + yRefRowOffset];
                nodeIndex = nodeIndex + 1;
                if (this.columns[dim].categorical !== null) {
                    const yOut = this.arrangeMethod === ParallelPlot.ARRANGE_FROM_BOTH
                        ? this.columns[dim].categorical.yTraceValueOut(rowIndex)
                        : y;
                    lineData[nodeIndex] = [x + xCatOffset, yOut + yRefRowOffset];
                    nodeIndex = nodeIndex + 1;
                }
            });
            return ParallelPlot.line(lineData);
        }
        editedPath(editedDim, position) {
            const thisPlot = this;
            return ParallelPlot.line(this.visibleDimensions.map(function (dim) {
                const x = thisPlot.xScaleVisibleDimension(dim);
                const xCatOffset = thisPlot.xCatOffset(dim);
                const y = (dim === editedDim || thisPlot.editedRowIndex === null)
                    ? position
                    : thisPlot.yTraceValue(dim, thisPlot.editedRowIndex);
                const yRefRowOffset = thisPlot.yRefRowOffset(dim);
                return [x + xCatOffset, y + yRefRowOffset];
            }));
        }
        drawHighlightedTrace(rowIndex) {
            if (rowIndex === null || this.editedPointDim !== null) {
                d3.select(this.bindto + " .subHlTrace")
                    .style("display", "none");
                d3.select(this.bindto + " .hlTrace")
                    .style("display", "none");
            }
            else {
                const row = this.sampleData[rowIndex];
                const stroke = this.rowColor(row);
                const greyStroke = ParallelPlot.greyStroke(stroke);
                d3.select(this.bindto + " .subHlTrace")
                    .attr("d", this.path(rowIndex))
                    .attr("stroke", greyStroke)
                    .style("display", null);
                d3.select(this.bindto + " .hlTrace")
                    .attr("d", this.path(rowIndex))
                    .attr("stroke", stroke)
                    .style("display", null);
            }
            d3.select(this.bindto + " .foreground")
                .attr("opacity", rowIndex === null && this.editedRowIndex === null ? 0.8 : 0.6);
        }
        initTraceTooltip() {
            const rowIndex = 0;
            const coords = this.traceTooltipLocation();
            const thisPlot = this;
            const tooltipTitle = this.rowLabels
                ? this.rowLabels[rowIndex]
                : "Point " + (rowIndex + 1);
            d3.select(this.bindto + " .ppTooltip").remove();
            const ppDiv = d3.select(this.bindto + " .ppDiv");
            const tooltip = ppDiv.append("div")
                .attr("class", "ppTooltip")
                .style("display", "none")
                .style("left", coords[0] + "px")
                .style("top", coords[1] + "px");
            tooltip.append("div")
                .attr("class", "pointIndex title")
                .text(tooltipTitle);
            tooltip.append("div").selectAll("xNameDiv").data(this.visibleDimensions)
                .enter()
                .append("div")
                .attr("class", "xNameDiv")
                .html(dim => {
                const column = thisPlot.columns[dim];
                return `<span class="xName">${column.labelText()}</span>: <span class="xValue">${column.formatedRowValue(this.sampleData[rowIndex])}</span>`;
            });
        }
        showTraceTooltip(row, rowIndex, coords) {
            const thisPlot = this;
            const tooltipTitle = this.rowLabels
                ? this.rowLabels[rowIndex]
                : "Point " + (rowIndex + 1);
            const tooltip = d3.select(this.bindto + " .ppTooltip")
                .style("display", "block")
                .style("left", coords[0] + "px")
                .style("top", coords[1] + "px");
            tooltip.select(".pointIndex.title")
                .text(tooltipTitle);
            const xNameDiv = tooltip.selectAll(".xNameDiv");
            xNameDiv.select(".xName")
                .text(dim => {
                return thisPlot.columns[dim].labelText();
            });
            xNameDiv.select(".xValue")
                .text(dim => {
                return thisPlot.columns[dim].formatedRowValue(row);
            });
        }
        traceTooltipLocation() {
            const ppDivNode = d3.select(this.bindto + " .ppDiv").node();
            const parentBounds = (ppDivNode === null) ? null : ppDivNode.getBoundingClientRect();
            const xParent = (parentBounds === null) ? 0 : parentBounds.x;
            const yParent = (parentBounds === null) ? 0 : parentBounds.y;
            const plotGroup = d3.select(this.bindto + " .plotGroup").node();
            const elementBounds = (plotGroup === null) ? null : plotGroup.getBoundingClientRect();
            const xRect = (elementBounds === null) ? 0 : elementBounds.x;
            const yRect = (elementBounds === null) ? 0 : elementBounds.y;
            const wRect = (elementBounds === null) ? 0 : elementBounds.width;
            return [xRect - xParent + wRect + 5, yRect - yParent + 20];
        }
        static greyStroke(stroke) {
            const strokeColor = d3.color(stroke);
            let greyStroke = d3.rgb(0, 0, 0);
            if (strokeColor) {
                const rgb = strokeColor.rgb();
                const greyComp = Math.round(((rgb.r ^ 255) + (rgb.g ^ 255) + (rgb.b ^ 255)) / 3);
                greyStroke = d3.rgb(greyComp, greyComp, greyComp);
            }
            return greyStroke.hex();
        }
        // eslint-disable-next-line max-lines-per-function
        drawEditedTrace() {
            const thisPlot = this;
            const editedRowIndex = this.editedRowIndex;
            if (editedRowIndex === null) {
                d3.select(this.bindto + " .subEditedTrace")
                    .style("display", "none");
                d3.select(this.bindto + " .editedTrace")
                    .style("display", "none");
            }
            else {
                const row = this.sampleData[editedRowIndex];
                const stroke = thisPlot.selectedRows.has(editedRowIndex) ? thisPlot.rowColor(row) : "#FFFFFF";
                const greyStroke = ParallelPlot.greyStroke(stroke);
                d3.select(this.bindto + " .subEditedTrace")
                    .attr("d", this.path(editedRowIndex))
                    .attr("stroke", greyStroke)
                    .style("display", null);
                d3.select(this.bindto + " .editedTrace")
                    .attr("d", this.path(editedRowIndex))
                    .attr("stroke", stroke)
                    .style("display", null);
            }
            d3.select(this.bindto + " .foreground")
                .attr("opacity", this.editedRowIndex === null ? 0.8 : 0.6);
            const visibleInputDims = this.visibleDimensions.filter(dim => thisPlot.columns[dim].isInput());
            d3.select(this.bindto + " .editionCircles")
                .style("display", function () {
                return thisPlot.editedRowIndex === null ? "none" : null;
            })
                .selectAll(".gEditionCircle")
                .data(visibleInputDims)
                .join(function (enter) {
                const gEditionCircle = enter.append("g")
                    .attr("class", "gEditionCircle");
                gEditionCircle.append("circle")
                    .attr("r", 4)
                    .call(d3.drag()
                    .on("start", function (dim) {
                    thisPlot.editedPointDim = dim;
                    thisPlot.drawEditedTrace();
                })
                    .on("drag", function (dim) {
                    thisPlot.pointDrag(dim);
                })
                    .on("end", function (dim) {
                    thisPlot.pointDragEnd(dim);
                }));
                return gEditionCircle;
            }, update => update, exit => exit.remove())
                .attr("transform", function (dim) {
                const x = thisPlot.xScaleVisibleDimension(dim);
                const xCatOffset = thisPlot.xCatOffset(dim);
                const yRefRowOffset = thisPlot.yRefRowOffset(dim);
                return `translate(${x + xCatOffset}, ${yRefRowOffset})`;
            })
                .select("circle")
                .attr("cx", 0)
                .filter(dim => dim !== thisPlot.editedPointDim)
                .attr("cy", function (dim) {
                if (thisPlot.editedRowIndex === null) {
                    return 0;
                }
                return thisPlot.yTraceValue(dim, thisPlot.editedRowIndex);
            });
        }
        pointDrag(draggedDim) {
            if (this.editionMode === ParallelPlot.EDITION_ON_DRAG_END) {
                this.dragEditionPoint(draggedDim, d3.event.y);
            }
            else if (this.editionMode === ParallelPlot.EDITION_ON_DRAG) {
                this.dragEditionPoint(draggedDim, d3.event.y);
                this.askForPointEdition(draggedDim);
            }
        }
        pointDragEnd(draggedDim) {
            if (this.editionMode !== ParallelPlot.EDITION_OFF) {
                this.askForPointEdition(draggedDim);
                this.editedPointDim = null;
            }
        }
        dragEditionPoint(draggedDim, position) {
            if (this.editedRowIndex === null) {
                console.error("dragEditionPoint is called but editedRowIndex is null");
                return;
            }
            const thisPlot = this;
            d3.select(this.bindto + " .editionCircles")
                .selectAll("circle")
                .filter(dim => dim === draggedDim)
                .attr("cy", function (_dim) {
                return position;
            });
            d3.select(this.bindto + " .foreground")
                .selectAll("path")
                .filter((_row, i) => i === thisPlot.editedRowIndex)
                .attr("d", this.editedPath(draggedDim, position));
            d3.select(this.bindto + " .subEditedTrace")
                .attr("d", this.editedPath(draggedDim, position));
            d3.select(this.bindto + " .editedTrace")
                .attr("d", this.editedPath(draggedDim, position));
        }
        askForPointEdition(draggedDim) {
            if (this.editedRowIndex === null) {
                console.error("dragEditedTrace is called but editedRowIndex is null");
                return;
            }
            const position = d3.event.y;
            if (this.columns[draggedDim].categorical) {
                const newValue = this.columns[draggedDim].categorical.invertYValue(position);
                const categories = this.columns[draggedDim].categorical.categories;
                const catIndex = Math.round(newValue);
                if (catIndex >= 0 && catIndex < categories.length) {
                    this.sendPointEditionEvent(draggedDim, this.editedRowIndex, categories[catIndex]);
                }
            }
            if (this.columns[draggedDim].continuous) {
                const newValue = this.columns[draggedDim].continuous.y().invert(position);
                this.sendPointEditionEvent(draggedDim, this.editedRowIndex, newValue);
            }
        }
        applyColumnCutoffs() {
            const thisPlot = this;
            this.updateSelectedRows();
            d3.select(this.bindto + " .foreground")
                .selectAll("path")
                .style("display", function (_d, i) {
                return thisPlot.selectedRows.has(i) ? null : "none";
            });
            d3.select(this.bindto + " .background")
                .selectAll("path")
                .style("display", function (_d, i) {
                return thisPlot.selectedRows.has(i) ? "none" : null;
            });
            d3.select(this.bindto + " .plotGroup").selectAll(".histogram")
                .style("display", function () {
                return thisPlot.selectedRows.size > thisPlot.sampleData.length / 10.0
                    ? null
                    : "none";
            });
            this.drawSelectedHistograms();
        }
        setContCutoff(brushSelections, dim, end) {
            if (this.columns[dim].continuous) {
                const contCutoffs = brushSelections
                    .map(interval => interval.map(this.columns[dim].continuous.y().invert))
                    .map(interval => {
                    return interval.sort(function (a, b) {
                        return b - a;
                    });
                });
                if (contCutoffs === null || contCutoffs.length === 0) {
                    this.columns[dim].continuous.contCutoffs = null;
                }
                else {
                    this.columns[dim].continuous.contCutoffs = contCutoffs;
                }
            }
            else {
                throw new Error("'setContCutoff' failed for:" + dim);
            }
            this.sendCutoffEvent(dim, end);
        }
        sendCutoffEvent(updatedDim, end) {
            this.updateSelectedRows();
            if (end) {
                this.dispatch.call(ParallelPlot.PLOT_EVENT, undefined, {
                    type: ParallelPlot.CUTOFF_EVENT,
                    value: { updatedDim: updatedDim, cutoffs: this.getValue(ParallelPlot.CO_ATTR_TYPE), selectedTraces: this.getValue(ParallelPlot.ST_ATTR_TYPE) }
                });
            }
            this.applyColumnCutoffs();
        }
        sendPointEditionEvent(dim, rowIndex, newValue) {
            this.dispatch.call(ParallelPlot.PLOT_EVENT, undefined, {
                type: ParallelPlot.EDITION_EVENT,
                value: { dim: dim, rowIndex: rowIndex, newValue: newValue }
            });
        }
        changeRow(rowIndex, newValues) {
            const thisPlot = this;
            const changedRow = this.sampleData[rowIndex];
            d3.keys(this.sampleData[0]).forEach(function (dim) {
                thisPlot.columns[dim].unvalid();
            });
            d3.keys(newValues).forEach((dim) => {
                if (thisPlot.columns[dim].categorical) {
                    const categories = thisPlot.columns[dim].categorical.categories;
                    changedRow[dim] = categories.indexOf(newValues[dim].toString());
                }
                else {
                    changedRow[dim] = +newValues[dim];
                }
            });
            this.sampleData[rowIndex] = changedRow;
            const isKept = thisPlot.dimensions.every(function (dim) {
                return thisPlot.columns[dim].isKept(thisPlot.sampleData[rowIndex][dim]);
            });
            if (isKept) {
                thisPlot.selectedRows.add(rowIndex);
            }
            else {
                thisPlot.selectedRows.delete(rowIndex);
            }
            this.unvalidateColumnInit();
            this.buildPlotArea();
            this.style.applyCssRules();
        }
        drawMainHistograms() {
            d3.select(this.bindto + " .plotGroup")
                .selectAll(".dimension")
                .each(dim => this.columns[dim].drawMainHistogram());
        }
        drawSelectedHistograms() {
            const selected = this.sampleData.filter((_row, i) => this.selectedRows.has(i));
            d3.select(this.bindto + " .plotGroup")
                .selectAll(".dimension")
                .each(dim => this.columns[dim].drawSelectedHistogram(selected));
        }
        // eslint-disable-next-line max-lines-per-function
        getPlotConfig() {
            const allDimensions = d3.keys(this.sampleData[0]);
            const controlWidgets = d3.select(this.bindto + " .ppDiv").classed("withWidgets");
            const categorical = allDimensions.map(dim => {
                if (this.columns[dim]) {
                    return this.columns[dim].categorical
                        ? this.columns[dim].categorical.categories
                        : null;
                }
                return null;
            });
            const inputColumns = allDimensions.map(dim => this.columns[dim] && this.columns[dim].ioType === pp.Column.INPUT);
            const keptColumns = allDimensions.map(dim => this.dimensions.includes(dim));
            const histoVisibility = allDimensions.map(dim => this.columns[dim]
                ? this.columns[dim].histoVisible
                : false);
            const invertedAxes = allDimensions.map(dim => {
                if (this.columns[dim]) {
                    return this.columns[dim].continuous
                        ? this.columns[dim].continuous.invertedAxe
                        : false;
                }
                return false;
            });
            const cutoffs = allDimensions.map(dim => this.columns[dim]
                ? this.columns[dim].getCutoffs()
                : null);
            const columnLabels = allDimensions.map(dim => this.columns[dim] && this.columns[dim].label
                ? this.columns[dim].label
                : dim);
            return {
                data: [],
                rowLabels: this.rowLabels,
                categorical: categorical,
                categoriesRep: this.catEquallySpacedLines ? ParallelPlot.CATEGORIES_REP_LIST[0] : ParallelPlot.CATEGORIES_REP_LIST[1],
                arrangeMethod: this.arrangeMethod,
                inputColumns: inputColumns,
                keptColumns: keptColumns,
                histoVisibility: histoVisibility,
                invertedAxes: invertedAxes,
                cutoffs: cutoffs,
                refRowIndex: this.refRowIndex,
                refColumnDim: this.refColumnDim,
                rotateTitle: this.rotateTitle,
                columnLabels: columnLabels,
                categoricalCS: this.categoricalCsId,
                continuousCS: this.continuousCsId,
                editionMode: this.continuousCsId,
                controlWidgets: controlWidgets,
                cssRules: this.style.cssRules,
                sliderPosition: {
                    dimCount: this.visibleDimCount,
                    startingDimIndex: this.startingDimIndex
                }
            };
        }
    }
    ParallelPlot.mainHistoColor = "#a6f2f2";
    ParallelPlot.secondHistoColor = "#169c9c";
    ParallelPlot.CONTINUOUS_CS = {
        // From d3-scale.
        Viridis: d3.interpolateViridis,
        Inferno: d3.interpolateInferno,
        Magma: d3.interpolateMagma,
        Plasma: d3.interpolatePlasma,
        Warm: d3.interpolateWarm,
        Cool: d3.interpolateCool,
        Rainbow: d3.interpolateRainbow,
        CubehelixDefault: d3.interpolateCubehelixDefault,
        // From d3-scale-chromatic
        Blues: d3.interpolateBlues,
        Greens: d3.interpolateGreens,
        Greys: d3.interpolateGreys,
        Oranges: d3.interpolateOranges,
        Purples: d3.interpolatePurples,
        Reds: d3.interpolateReds,
        BuGn: d3.interpolateBuGn,
        BuPu: d3.interpolateBuPu,
        GnBu: d3.interpolateGnBu,
        OrRd: d3.interpolateOrRd,
        PuBuGn: d3.interpolatePuBuGn,
        PuBu: d3.interpolatePuBu,
        PuRd: d3.interpolatePuRd,
        RdBu: d3.interpolateRdBu,
        RdPu: d3.interpolateRdPu,
        YlGnBu: d3.interpolateYlGnBu,
        YlGn: d3.interpolateYlGn,
        YlOrBr: d3.interpolateYlOrBr,
        YlOrRd: d3.interpolateYlOrRd
    };
    ParallelPlot.CONTINUOUS_CS_IDS = Object.keys(ParallelPlot.CONTINUOUS_CS);
    ParallelPlot.CATEGORIAL_CS = {
        Category10: d3.scaleOrdinal(d3.schemeCategory10),
        Accent: d3.scaleOrdinal(d3.schemeAccent),
        Dark2: d3.scaleOrdinal(d3.schemeDark2),
        Paired: d3.scaleOrdinal(d3.schemePaired),
        Set1: d3.scaleOrdinal(d3.schemeSet1)
    };
    ParallelPlot.CATEGORIAL_CS_IDS = Object.keys(ParallelPlot.CATEGORIAL_CS);
    ParallelPlot.CATEGORIES_REP_LIST = ["EquallySpacedLines", "EquallySizedBoxes"];
    ParallelPlot.margin = { top: 100, right: 10, bottom: 10, left: 10 };
    ParallelPlot.catClusterWidth = 12;
    ParallelPlot.line = d3.line();
    ParallelPlot.PLOT_EVENT = "plotEvent";
    ParallelPlot.CUTOFF_EVENT = "cutoffChange";
    ParallelPlot.EDITION_EVENT = "pointChange";
    ParallelPlot.CO_ATTR_TYPE = "Cutoffs";
    ParallelPlot.ST_ATTR_TYPE = "SelectedTraces";
    ParallelPlot.RC_ATTR_TYPE = "ReferenceColumn";
    ParallelPlot.EDITION_OFF = "EditionOff";
    ParallelPlot.EDITION_ON_DRAG = "EditionOnDrag";
    ParallelPlot.EDITION_ON_DRAG_END = "EditionOnDragEnd";
    ParallelPlot.EDITION_MODE_IDS = [ParallelPlot.EDITION_OFF, ParallelPlot.EDITION_ON_DRAG, ParallelPlot.EDITION_ON_DRAG_END,];
    ParallelPlot.MAX_VISIBLE_DIMS = 30;
    ParallelPlot.DEFAULT_SLIDER_POSITION = {
        dimCount: 15,
        startingDimIndex: 0
    };
    ParallelPlot.ARRANGE_FROM_LEFT = "fromLeft";
    ParallelPlot.ARRANGE_FROM_RIGHT = "fromRight";
    ParallelPlot.ARRANGE_FROM_BOTH = "fromBoth";
    ParallelPlot.ARRANGE_FROM_NONE = "fromNone";
    ParallelPlot.ARRANGE_METHODS = [ParallelPlot.ARRANGE_FROM_LEFT, ParallelPlot.ARRANGE_FROM_RIGHT, ParallelPlot.ARRANGE_FROM_BOTH, ParallelPlot.ARRANGE_FROM_NONE];
    ParallelPlot.D3_TRANSITION_DURATION = 500;
    pp.ParallelPlot = ParallelPlot;
})(pp || (pp = {}));
// eslint-disable-next-line no-unused-vars
var pp;
(function (pp) {
    class Style {
        constructor(bindto) {
            this.bindto = bindto;
        }
        applyCssRules() {
            if (this.cssRules) {
                for (const [selector, declarations] of Object.entries(this.cssRules)) {
                    const selection = d3.select(this.bindto).selectAll(selector);
                    const applyDeclaration = (declaration) => {
                        const splitDeclaration = declaration.split(":");
                        if (splitDeclaration.length === 2) {
                            selection.style(splitDeclaration[0], splitDeclaration[1]);
                        }
                        else {
                            console.error("Invalid CSS declaration:", declaration);
                        }
                    };
                    if (Array.isArray(declarations)) {
                        declarations.forEach(applyDeclaration);
                    }
                    if (typeof declarations === "string") {
                        applyDeclaration(declarations);
                    }
                }
            }
        }
    }
    pp.Style = Style;
})(pp || (pp = {}));

//# sourceMappingURL=maps/pp.js.map
