import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { LanguageProvider } from './contexts/LanguageContext.jsx'
import HomePage from './components/HomePage.jsx'
import CharacterSetupPage from './components/CharacterSetupPage.jsx'
import StorySetupPage from './components/StorySetupPage.jsx'
import ContentSetupPage from './components/ContentSetupPage.jsx'
import PreviewPage from './components/PreviewPage.jsx'
import DebugPage from './components/DebugPage.jsx'
import ImageTestPage from './components/ImageTestPage.jsx'

import LiblibTestPage from './components/LiblibTestPage.jsx'
import './App.css'

function App() {
  return (
    <LanguageProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/character-setup" element={<CharacterSetupPage />} />
            <Route path="/story-setup" element={<StorySetupPage />} />
            <Route path="/content-setup" element={<ContentSetupPage />} />
            <Route path="/preview" element={<PreviewPage />} />
            <Route path="/debug" element={<DebugPage />} />
            <Route path="/image-test" element={<ImageTestPage />} />

            <Route path="/liblib-test" element={<LiblibTestPage />} />
          </Routes>
        </div>
      </Router>
    </LanguageProvider>
  )
}

export default App

