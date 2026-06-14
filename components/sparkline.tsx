'use client'
import * as React from 'react'

type LineProps = {
  values: number[]
  height?: number
  width?: number
  color?: string
  fill?: string
  strokeWidth?: number
  className?: string
}

export function Sparkline({
  values,
  height = 28,
  width = 96,
  color = 'currentColor',
  fill,
  strokeWidth = 1.5,
  className,
}: LineProps) {
  if (!values || values.length < 2) {
    return (
      <svg width={width} height={height} className={className} aria-hidden="true">
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke={color}
          strokeOpacity={0.35}
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      </svg>
    )
  }

  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const pad = strokeWidth + 1
  const innerH = height - pad * 2
  const dx = width / (values.length - 1)
  const norm = (v: number) => pad + innerH - ((v - min) / span) * innerH

  let linePath = ''
  values.forEach((v, i) => {
    const x = i * dx
    const y = norm(v)
    linePath += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)} `
  })
  const areaPath = fill
    ? `${linePath}L${width},${height} L0,${height} Z`
    : null

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      {areaPath && <path d={areaPath} fill={fill} />}
      <path
        d={linePath.trim()}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

type BarsProps = {
  values: number[]
  height?: number
  width?: number
  color?: string
  className?: string
  gap?: number
}

export function SparkBars({
  values,
  height = 24,
  width = 110,
  color = 'currentColor',
  className,
  gap = 1,
}: BarsProps) {
  if (!values || values.length === 0) {
    return (
      <svg width={width} height={height} className={className} aria-hidden="true" />
    )
  }
  const max = Math.max(...values, 1)
  const n = values.length
  const barW = Math.max(1, (width - gap * (n - 1)) / n)
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      {values.map((v, i) => {
        const h = max === 0 ? 0 : Math.max(1, (v / max) * height)
        const x = i * (barW + gap)
        const y = height - h
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={h}
            fill={color}
            opacity={v === 0 ? 0.25 : 1}
            rx={0.5}
          />
        )
      })}
    </svg>
  )
}
