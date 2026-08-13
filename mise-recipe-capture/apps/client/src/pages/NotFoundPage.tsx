import { MapPinned } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../components/domain/status'
import { Button } from '../components/ui/primitives'

export const NotFoundPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className="mx-auto max-w-3xl pt-12">
      <EmptyState
        icon={MapPinned}
        title={t('notFound.title')}
        description={t('notFound.description')}
        action={
          <Button type="button" onClick={() => navigate('/recipes')}>
            {t('notFound.action')}
          </Button>
        }
      />
    </div>
  )
}
