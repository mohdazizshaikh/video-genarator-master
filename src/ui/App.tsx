import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/shared/LoadingSpinner';

const VideoList = lazy(() => import('./pages/VideoList'));
const VideoCreator = lazy(() => import('./pages/VideoCreator'));
const VideoDetails = lazy(() => import('./pages/VideoDetails'));
const BulkQueue = lazy(() => import('./pages/BulkQueue'));
const CategoryMapping = lazy(() => import('./pages/CategoryMapping'));
const PublishDashboard = lazy(() => import('./pages/PublishDashboard'));
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'));
const SchedulerDashboard = lazy(() => import('./pages/SchedulerDashboard'));
const ABTestingDashboard = lazy(() => import('./pages/ABTestingDashboard'));
const AIDashboard = lazy(() => import('./pages/AIDashboard'));
const TenantConsole = lazy(() => import('./pages/TenantConsole'));
const ContentTools = lazy(() => import('./pages/ContentTools'));
const HealthDashboard = lazy(() => import('./pages/HealthDashboard'));
const TrendDashboard = lazy(() => import('./pages/TrendDashboard'));
const HookLibrary = lazy(() => import('./pages/HookLibrary'));
const ImageGenerator = lazy(() => import('./pages/ImageGenerator'));
const RecycleDashboard = lazy(() => import('./pages/RecycleDashboard'));
const CostTracker = lazy(() => import('./pages/CostTracker'));
const StrategyDashboard = lazy(() => import('./pages/StrategyDashboard'));
const WebhookDashboard = lazy(() => import('./pages/WebhookDashboard'));
const BrandingDashboard = lazy(() => import('./pages/BrandingDashboard'));
const HumanizedContentPage = lazy(() => import('./pages/HumanizedContentPage'));
const ThumbnailPage = lazy(() => import('./pages/ThumbnailPage'));
const EditingPage = lazy(() => import('./pages/EditingPage'));
const VisualEnhancementPage = lazy(() => import('./pages/VisualEnhancementPage'));
const AudioQualityPage = lazy(() => import('./pages/AudioQualityPage'));
const EmotionalResonancePage = lazy(() => import('./pages/EmotionalResonancePage'));
const AttentionOptimizerPage = lazy(() => import('./pages/AttentionOptimizerPage'));
const QualityScoringPage = lazy(() => import('./pages/QualityScoringPage'));
const EngagementPredictionPage = lazy(() => import('./pages/EngagementPredictionPage'));
const AccountManagerPage = lazy(() => import('./pages/AccountManagerPage'));
const TranslatePage = lazy(() => import('./pages/TranslatePage'));
const CommentCtaPage = lazy(() => import('./pages/CommentCtaPage'));
const SeriesBuilderPage = lazy(() => import('./pages/SeriesBuilderPage'));
const WatermarkPage = lazy(() => import('./pages/WatermarkPage'));
const ShadowbanPage = lazy(() => import('./pages/ShadowbanPage'));
const VideoLibraryPage = lazy(() => import('./pages/VideoLibraryPage'));
const SchedulePersistPage = lazy(() => import('./pages/SchedulePersistPage'));
const ImageFilterPage = lazy(() => import('./pages/ImageFilterPage'));
const AutoModePage = lazy(() => import('./pages/AutoModePage'));
const PipelineComparePage = lazy(() => import('./pages/PipelineComparePage'));
const EnginesDashboard = lazy(() => import('./pages/EnginesDashboard'));
const ProfilesPage = lazy(() => import('./pages/ProfilesPage'));
const OAuthSuccessPage = lazy(() => import('./pages/OAuthSuccessPage'));
const ConnectorsPage = lazy(() => import('./pages/ConnectorsPage'));
const ReleasesPage = lazy(() => import('./pages/ReleasesPage'));

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner message="Loading page..." />}>
            <Routes>
              <Route path="/" element={<VideoList />} />
              <Route path="/create" element={<VideoCreator />} />
              <Route path="/video/:videoId" element={<VideoDetails />} />
              <Route path="/queue" element={<BulkQueue />} />
              <Route path="/mappings" element={<CategoryMapping />} />
              <Route path="/publish" element={<PublishDashboard />} />
              <Route path="/analytics" element={<AnalyticsDashboard />} />
              <Route path="/scheduler" element={<SchedulerDashboard />} />
              <Route path="/ab-testing" element={<ABTestingDashboard />} />
              <Route path="/ai" element={<AIDashboard />} />
              <Route path="/health" element={<HealthDashboard />} />
              <Route path="/tenants" element={<TenantConsole />} />
              <Route path="/content-tools" element={<ContentTools />} />
              <Route path="/trends" element={<TrendDashboard />} />
              <Route path="/hooks" element={<HookLibrary />} />
              <Route path="/image-generator" element={<ImageGenerator />} />
              <Route path="/recycle" element={<RecycleDashboard />} />
              <Route path="/costs" element={<CostTracker />} />
              <Route path="/strategy" element={<StrategyDashboard />} />
              <Route path="/webhooks" element={<WebhookDashboard />} />
              <Route path="/branding" element={<BrandingDashboard />} />
              <Route path="/humanized" element={<HumanizedContentPage />} />
              <Route path="/thumbnail" element={<ThumbnailPage />} />
              <Route path="/editing" element={<EditingPage />} />
              <Route path="/visual" element={<VisualEnhancementPage />} />
              <Route path="/audio" element={<AudioQualityPage />} />
              <Route path="/emotional" element={<EmotionalResonancePage />} />
              <Route path="/attention" element={<AttentionOptimizerPage />} />
              <Route path="/quality" element={<QualityScoringPage />} />
              <Route path="/engagement" element={<EngagementPredictionPage />} />
              <Route path="/account" element={<AccountManagerPage />} />
              <Route path="/translate" element={<TranslatePage />} />
              <Route path="/comment-cta" element={<CommentCtaPage />} />
              <Route path="/series" element={<SeriesBuilderPage />} />
              <Route path="/watermark" element={<WatermarkPage />} />
              <Route path="/shadowban" element={<ShadowbanPage />} />
              <Route path="/video-library" element={<VideoLibraryPage />} />
              <Route path="/schedule-manager" element={<SchedulePersistPage />} />
              <Route path="/image-filters" element={<ImageFilterPage />} />
              <Route path="/auto-mode" element={<AutoModePage />} />
              <Route path="/compare" element={<PipelineComparePage />} />
              <Route path="/engines-dashboard" element={<EnginesDashboard />} />
              <Route path="/profiles" element={<ProfilesPage />} />
              <Route path="/connectors" element={<ConnectorsPage />} />
              <Route path="/releases" element={<ReleasesPage />} />
              <Route path="/oauth/success" element={<OAuthSuccessPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </Layout>
    </Router>
  );
};

export default App;
