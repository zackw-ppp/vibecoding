import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppRuntime } from './components/AppRuntime'
import { AppShell } from './components/layout/AppShell'
import { CollectionsPage } from './pages/CollectionsPage'
import { CookPage } from './pages/CookPage'
import { ImportPage } from './pages/ImportPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RecipeDetailPage } from './pages/RecipeDetailPage'
import { RecipesPage } from './pages/RecipesPage'
import { ReviewPage } from './pages/ReviewPage'
import { SettingsPage } from './pages/SettingsPage'
import { WelcomePage } from './pages/WelcomePage'

const ImportJobRedirect = () => {
  const { jobId } = useParams()
  return <Navigate replace to={`/import/${jobId ?? ''}/review`} />
}

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<WelcomePage />} />
    <Route path="/auth" element={<WelcomePage />} />
    <Route path="/recipes/:id/cook" element={<CookPage />} />
    <Route element={<AppShell />}>
      <Route path="/recipes" element={<RecipesPage />} />
      <Route path="/recipes/:id" element={<RecipeDetailPage />} />
      <Route path="/import" element={<ImportPage />} />
      <Route path="/import/:jobId" element={<ImportJobRedirect />} />
      <Route path="/import/:jobId/review" element={<ReviewPage />} />
      <Route path="/collections" element={<CollectionsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/settings/*" element={<SettingsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
)

const App = () => (
  <BrowserRouter>
    <AppRuntime>
      <AppRoutes />
      <Toaster position="bottom-center" richColors />
    </AppRuntime>
  </BrowserRouter>
)

export default App
