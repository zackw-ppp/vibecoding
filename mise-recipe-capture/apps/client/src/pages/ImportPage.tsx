import {
  AlertTriangle,
  ArrowRight,
  FileText,
  ImagePlus,
  Link2,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Upload,
  Video,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  ImportJobCard,
  ProcessingTimeline,
} from '../components/domain/status'
import { Badge, Button, Card, Input, Label } from '../components/ui/primitives'
import type { Platform } from '../data/types'
import { useMiseStore } from '../store/use-mise-store'

const supportedPlatforms: Platform[] = [
  'xiaohongshu',
  'douyin',
  'bilibili',
  'tiktok',
  'youtube',
  'upload',
]

export const ImportPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const jobs = useMiseStore((state) => state.jobs)
  const createImport = useMiseStore((state) => state.createImport)
  const cancelImport = useMiseStore((state) => state.cancelImport)
  const retryImport = useMiseStore((state) => state.retryImport)
  const [url, setUrl] = useState('')
  const [urlState, setUrlState] = useState<'idle' | 'invalid' | 'fixture'>('idle')
  const [localMessage, setLocalMessage] = useState(false)
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null)

  const startSample = () => {
    const id = createImport()
    setLastCreatedId(id)
    setUrlState('idle')
    setLocalMessage(false)
  }

  const checkUrl = (event: React.FormEvent) => {
    event.preventDefault()
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setUrlState('invalid')
        return
      }
      setUrlState('fixture')
    } catch {
      setUrlState('invalid')
    }
  }

  const activeCreatedJob = jobs.find((job) => job.id === lastCreatedId)

  return (
    <div className="mx-auto max-w-[1180px]">
      <header className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
          {t('import.eyebrow')}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
          {t('import.title')}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t('import.description')}
        </p>
      </header>

      <Card className="mt-7 overflow-hidden">
        <div className="border-b border-border bg-secondary/45 p-5 sm:p-7">
          <form onSubmit={checkUrl}>
            <Label htmlFor="source-url">{t('import.urlLabel')}</Label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Link2
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="source-url"
                  value={url}
                  onChange={(event) => {
                    setUrl(event.target.value)
                    setUrlState('idle')
                  }}
                  placeholder={t('import.urlPlaceholder')}
                  className="pl-10"
                  aria-invalid={urlState === 'invalid'}
                  aria-describedby={urlState !== 'idle' ? 'url-feedback' : undefined}
                />
              </div>
              <Button type="submit" size="lg">
                {t('import.submit')}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </form>

          <div id="url-feedback" className="mt-3" aria-live="polite">
            {urlState === 'invalid' && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/8 p-3 text-sm">
                <AlertTriangle
                  className="mt-0.5 size-4 shrink-0 text-destructive"
                  aria-hidden="true"
                />
                <span>{t('import.invalidUrl')}</span>
              </div>
            )}
            {urlState === 'fixture' && (
              <div className="rounded-lg border border-warning/35 bg-warning/12 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    className="mt-0.5 size-5 shrink-0 text-warning-foreground"
                    aria-hidden="true"
                  />
                  <div>
                    <h2 className="font-semibold">{t('import.realUrlTitle')}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {t('import.realUrlDescription')}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      className="mt-3"
                      onClick={startSample}
                    >
                      <PlayCircle className="size-4" aria-hidden="true" />
                      {t('import.processSampleInstead')}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            className="group flex min-h-36 flex-col items-start bg-card p-5 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            onClick={startSample}
          >
            <span className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <span className="mt-4 font-semibold">{t('import.trySample')}</span>
            <span className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t('import.sampleDescription')}
            </span>
          </button>
          {[
            { key: 'import.uploadVideo', icon: Video },
            { key: 'import.uploadImages', icon: ImagePlus },
            { key: 'import.pasteText', icon: FileText },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              className="group flex min-h-36 flex-col items-start bg-card p-5 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              onClick={() => setLocalMessage(true)}
            >
              <span className="grid size-10 place-items-center rounded-md bg-muted text-muted-foreground group-hover:text-primary">
                <item.icon className="size-5" aria-hidden="true" />
              </span>
              <span className="mt-4 font-semibold">{t(item.key)}</span>
            </button>
          ))}
        </div>
      </Card>

      <div className="mt-3 min-h-8" aria-live="polite">
        {localMessage && (
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Upload className="size-4" aria-hidden="true" />
            {t('import.localInputUnavailable')}
          </p>
        )}
        {lastCreatedId && !localMessage && (
          <p className="inline-flex items-center gap-2 text-sm font-medium text-success">
            <Sparkles className="size-4" aria-hidden="true" />
            {t('import.created')}
          </p>
        )}
      </div>

      {activeCreatedJob && (
        <Card className="mt-5 grid gap-6 p-5 lg:grid-cols-[0.72fr_1.28fr] lg:p-6">
          <div>
            <Badge variant="primary">{t('fixture.label')}</Badge>
            <h2 className="mt-3 font-display text-2xl font-semibold">
              {t(`processing.stage.${activeCreatedJob.stage}`)}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t('import.sampleDescription')}
            </p>
          </div>
          <ProcessingTimeline
            stage={activeCreatedJob.stage}
            status={activeCreatedJob.status}
          />
        </Card>
      )}

      <section className="mt-10">
        <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold">
              {t('import.inboxTitle')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('import.inboxDescription')}
            </p>
          </div>
          <Badge variant="neutral">
            {t('common.recipeCount', { count: jobs.length })}
          </Badge>
        </div>
        <div className="mt-5 space-y-4">
          {jobs.map((job) => (
            <ImportJobCard
              key={job.id}
              job={job}
              onReview={() => navigate(`/import/${job.id}/review`)}
              onOpenRecipe={() =>
                job.resultRecipeId &&
                navigate(`/recipes/${job.resultRecipeId}`)
              }
              onCancel={() => cancelImport(job.id)}
              onRetry={() => {
                retryImport(job.id)
                setLastCreatedId(job.id)
              }}
            />
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-lg border border-border bg-muted/40 p-5 sm:p-6">
        <h2 className="font-display text-xl font-semibold">
          {t('import.supportedTitle')}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {t('import.supportedDescription')}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {supportedPlatforms.map((platform) => (
            <Badge key={platform} variant="outline">
              {t(`source.${platform}`)}
            </Badge>
          ))}
        </div>
      </section>
    </div>
  )
}
