"use client";

import {
    Bar,
    BarChart,
    Label,
    Rectangle,
    ReferenceLine,
    XAxis,
} from "recharts";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components//ui/card";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components//ui/chart";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

export const description = "A collection of health charts.";

type Props = {
    scanData: {
        date: string;
        scanned: number;
    }[];
    recyclingData: {
        year: number;
        boughtCount: number;
        returnedCount: number;
        recyclingRate: number;
    };
};

export function DashboardRcc({ scanData, recyclingData }: Props) {
    const TARGET_RECYCLING_RATE = parseInt(
        process.env.NEXT_PUBLIC_TARGET_RECYCLE_PER || "80"
    );

    const averageScanned = Math.round(
        scanData.reduce((acc, { scanned }) => acc + scanned, 0) /
            scanData.length
    );

    const totalScanned = scanData.reduce(
        (acc, { scanned }) => acc + scanned,
        0
    );

    const isMore = recyclingData.recyclingRate >= TARGET_RECYCLING_RATE;

    return (
        <div className="flex sm:flex-row flex-col flex-wrap justify-center items-start gap-6 mx-auto chart-wrapper">
            <Card x-chunk="charts-01-chunk-0">
                <CardHeader className="space-y-0 pb-2">
                    <CardDescription>Today</CardDescription>
                    <CardTitle className="text-4xl tabular-nums">
                        {scanData[0]?.scanned}{" "}
                        <span className="font-normal font-sans text-muted-foreground text-sm tracking-normal">
                            scanned
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer
                        config={{
                            scanned: {
                                label: "Scanned",
                                color: "hsl(var(--chart-1))",
                            },
                        }}
                    >
                        <BarChart
                            accessibilityLayer
                            margin={{
                                left: -4,
                                right: -4,
                            }}
                            data={scanData}
                        >
                            <Bar
                                dataKey="scanned"
                                fill="var(--color-scanned)"
                                radius={5}
                                fillOpacity={0.6}
                                activeBar={<Rectangle fillOpacity={0.8} />}
                            />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={4}
                                tickFormatter={(value) => {
                                    return new Date(value).toLocaleDateString(
                                        "en-US",
                                        {
                                            weekday: "short",
                                        }
                                    );
                                }}
                            />
                            <ChartTooltip
                                defaultIndex={2}
                                content={
                                    <ChartTooltipContent
                                        hideIndicator
                                        labelFormatter={(value) => {
                                            return new Date(
                                                value
                                            ).toLocaleDateString("en-US", {
                                                day: "numeric",
                                                month: "long",
                                                year: "numeric",
                                            });
                                        }}
                                    />
                                }
                                cursor={false}
                            />
                            <ReferenceLine
                                y={averageScanned}
                                stroke="hsl(var(--muted-foreground))"
                                strokeDasharray="3 3"
                                strokeWidth={1}
                            >
                                <Label
                                    position="insideBottomLeft"
                                    value="Average Scanned"
                                    offset={10}
                                    fill="hsl(var(--foreground))"
                                />
                                <Label
                                    position="insideTopLeft"
                                    value={averageScanned}
                                    className="text-lg"
                                    fill="hsl(var(--foreground))"
                                    offset={10}
                                    startOffset={100}
                                />
                            </ReferenceLine>
                        </BarChart>
                    </ChartContainer>
                </CardContent>
                <CardFooter className="flex-col items-start gap-1">
                    <CardDescription>
                        Over the past 7 days, we&apos;ve scanned{" "}
                        <span className="font-medium text-foreground">
                            {totalScanned}
                        </span>{" "}
                        products.
                    </CardDescription>
                </CardFooter>
            </Card>
            <Card x-chunk="charts-01-chunk-2">
                <CardHeader>
                    <CardTitle>Recycling Rate</CardTitle>
                    <CardDescription>
                        We&apos;ve average {isMore ? "more" : "less"} recycling
                        rate than our target.
                    </CardDescription>
                </CardHeader>
                <CardContent className="gap-4 grid">
                    <div className="gap-2 grid auto-rows-min">
                        <div className="flex items-baseline gap-1 font-bold text-2xl leading-none tabular-nums">
                            {TARGET_RECYCLING_RATE}%{" "}
                            <span className="font-normal text-muted-foreground text-sm">
                                target
                            </span>
                        </div>

                        <div className="relative">
                            <p className="top-1/2 left-2 z-20 absolute font-semibold text-xs -translate-y-1/2">
                                {recyclingData.year}
                            </p>
                            <Progress
                                value={recyclingData.recyclingRate}
                                max={TARGET_RECYCLING_RATE}
                                className="rounded-lg h-8"
                                aria-label="Recycling Rate"
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-row p-4 border-t">
                    <div className="flex items-center gap-2 w-full">
                        <div className="flex-1 gap-0.5 grid auto-rows-min">
                            <div className="text-muted-foreground text-xs">
                                Bought
                            </div>
                            <div className="flex items-baseline gap-1 font-bold text-2xl leading-none tabular-nums">
                                {recyclingData.boughtCount}
                                <span className="font-normal text-muted-foreground text-sm">
                                    packages
                                </span>
                            </div>
                        </div>
                        <Separator
                            orientation="vertical"
                            className="mx-2 w-px h-10"
                        />
                        <div className="flex-1 gap-0.5 grid auto-rows-min">
                            <div className="text-muted-foreground text-xs">
                                Recycled
                            </div>
                            <div className="flex items-baseline gap-1 font-bold text-2xl leading-none tabular-nums">
                                {recyclingData.returnedCount}
                                <span className="font-normal text-muted-foreground text-sm">
                                    packages
                                </span>
                            </div>
                        </div>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
