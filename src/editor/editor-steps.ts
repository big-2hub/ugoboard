import type { EditorIcon } from './editor-geometry'

export type EditorStep = {
  id: string
  order: number
  icons: EditorIcon[]
  holderId?: string
  note?: string
  motionControlPoints?: Array<{
    iconId: string
    points: Array<{ x: number; y: number }>
  }>
}

const cloneIcons = (icons: EditorIcon[]) =>
  icons.map((icon) => ({ ...icon, position: { ...icon.position } }))

const findHolderId = (icons: EditorIcon[]) =>
  icons.find((icon) => icon.kind === 'ball' && icon.holderId)?.holderId

export function createInitialStep(id: string): EditorStep {
  return { id, order: 1, icons: [] }
}

export function duplicateStep(
  steps: EditorStep[],
  currentStepId: string,
  newStepId: string,
): EditorStep[] {
  const currentIndex = steps.findIndex((step) => step.id === currentStepId)
  if (currentIndex < 0) return steps

  const icons = cloneIcons(steps[currentIndex].icons)
  const next = [
    ...steps.slice(0, currentIndex + 1),
    {
      id: newStepId,
      order: currentIndex + 2,
      icons,
      holderId: findHolderId(icons),
    },
    ...steps.slice(currentIndex + 1),
  ]
  return next.map((step, index) => ({ ...step, order: index + 1 }))
}

export function deleteStep(steps: EditorStep[], stepId: string): EditorStep[] {
  if (steps.length <= 1) return steps
  return steps
    .filter((step) => step.id !== stepId)
    .map((step, index) => ({ ...step, order: index + 1 }))
}

export function updateStepIcons(
  steps: EditorStep[],
  stepId: string,
  update: (icons: EditorIcon[]) => EditorIcon[],
): EditorStep[] {
  return steps.map((step) => {
    if (step.id !== stepId) return step
    const icons = update(cloneIcons(step.icons))
    return { ...step, icons, holderId: findHolderId(icons) }
  })
}

export function addIconToEveryStep(
  steps: EditorStep[],
  icon: EditorIcon,
  currentStepId?: string,
): EditorStep[] {
  return steps.map((step) => ({
    ...step,
    icons: [
      ...step.icons,
      {
        ...icon,
        position: { ...icon.position },
        holderId: step.id === currentStepId ? icon.holderId : undefined,
      },
    ],
  }))
}

export function deleteIconFromEveryStep(steps: EditorStep[], iconId: string): EditorStep[] {
  return steps.map((step) => {
    const icons = step.icons
      .filter((icon) => icon.id !== iconId)
      .map((icon) => icon.holderId === iconId ? { ...icon, holderId: undefined } : icon)
    return { ...step, icons, holderId: findHolderId(icons) }
  })
}
