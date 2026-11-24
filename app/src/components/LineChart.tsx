import { useState } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { C } from "./ui";

/** Gráfico de linha simples (sem dependências além do react-native-svg). */
export function LineChart({ points, unit, height = 160 }: { points: { label: string; value: number }[]; unit: string; height?: number }) {
  const [width, setWidth] = useState(0);
  if (points.length < 2) {
    return <Text style={{ color: C.muted, fontSize: 13 }}>Registre pelo menos 2 semanas para ver o gráfico.</Text>;
  }
  const padL = 36, padR = 10, padT = 12, padB = 22;
  const vals = points.map((p) => p.value);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (max - min < 1) { min -= 0.5; max += 0.5; }
  const w = Math.max(width - padL - padR, 1), h = height - padT - padB;
  const x = (i: number) => padL + (i / (points.length - 1)) * w;
  const y = (v: number) => padT + (1 - (v - min) / (max - min)) * h;
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const ticks = [max, (max + min) / 2, min];

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {ticks.map((t, i) => (
            <Line key={i} x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke={C.border} strokeDasharray="3 4" />
          ))}
          {ticks.map((t, i) => (
            <SvgText key={`t${i}`} x={padL - 6} y={y(t) + 4} fill={C.muted} fontSize="10" textAnchor="end">{t.toFixed(1)}</SvgText>
          ))}
          <Path d={d} stroke={C.accent} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => <Circle key={i} cx={x(i)} cy={y(p.value)} r={3.5} fill={C.accent} />)}
          <SvgText x={x(0)} y={height - 4} fill={C.muted} fontSize="10" textAnchor="start">{points[0].label}</SvgText>
          <SvgText x={x(points.length - 1)} y={height - 4} fill={C.muted} fontSize="10" textAnchor="end">
            {points[points.length - 1].label} · {points[points.length - 1].value.toFixed(1)} {unit}
          </SvgText>
        </Svg>
      )}
    </View>
  );
}
