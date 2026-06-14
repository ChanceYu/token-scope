import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

function readProjectFile(filePath: string): string {
  return readFileSync(path.join(repoRoot, filePath), 'utf8')
}

describe('grid-backed dark surfaces', () => {
  it('defines reusable page and card grid backgrounds', () => {
    const css = readProjectFile('app/globals.css')

    expect(css).toContain('.surface-grid')
    expect(css).toContain('.surface-grid::before')
    expect(css).toContain('linear-gradient(to right')
    expect(css).toContain('linear-gradient(to bottom')
  })

  it('applies the reusable surface to primary dashboard cards', () => {
    const surfaceFiles = [
      'components/ui/card.tsx',
      'components/hero-totals.tsx',
      'components/totals-cards.tsx',
      'components/trend-chart.tsx',
      'components/cost-chart.tsx',
      'components/activity-heatmap.tsx',
    ]

    for (const file of surfaceFiles) {
      expect(readProjectFile(file), file).toContain('surface-grid')
    }
  })

  it('keeps bottom list surfaces plain with grid-colour table lines', () => {
    const usageTable = readProjectFile('components/usage-table.tsx')
    const detailsTable = readProjectFile('components/details-table.tsx')

    expect(usageTable).not.toContain('surface-grid')
    expect(usageTable).toContain('border-primary/15')
    expect(usageTable).toContain('border-primary/[0.06]')
    expect(detailsTable).not.toContain('surface-grid')
    expect(detailsTable).toContain('border-primary/15')
    expect(detailsTable).toContain('border-primary/[0.06]')
  })

  it('keeps chart plot areas tall enough on narrow screens', () => {
    const trendChart = readProjectFile('components/trend-chart.tsx')
    const costChart = readProjectFile('components/cost-chart.tsx')

    expect(trendChart).toContain('min-h-56')
    expect(trendChart).toContain('minWidth={0}')
    expect(trendChart).toContain('initialDimension={{ width: 1, height: 1 }}')
    expect(costChart).toContain('min-h-56')
    expect(costChart).toContain('minWidth={0}')
    expect(costChart).toContain('initialDimension={{ width: 1, height: 1 }}')
  })
})
