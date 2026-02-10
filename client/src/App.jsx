import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Footer from './components/Footer'
import Canvas from './components/Canvas'
import Chatbox from './components/Chatbox'

const socket = io('http://localhost:3000')

function App() {

  const [activeCanvas, setActiveCanvas] = useState(null)
  const [chatboxIsVisible, setChatboxIsVisible] = useState(false);

  useEffect(() => {

    socket.on('canvasCreated', (data) => {
      setActiveCanvas({ width: data.width, height: data.height })
    })

  }, [])

  const createCanvas = (width, height) => {
    socket.emit('createCanvas', { width, height }) // Envoie une demande de création d'un canvas au serveur
  }

  const toggleChatbox = () => {
    chatboxIsVisible ? setChatboxIsVisible(false) : setChatboxIsVisible(true)
  };

  return (
    <div className="min-h-screen flex flex-col bg-base-200">
      <Navbar />
      <Chatbox toggleChatbox={toggleChatbox} chatboxIsVisible={chatboxIsVisible} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar newCanvas={createCanvas} openChat={toggleChatbox} />
        <main className="flex-1 relative flex items-center justify-center bg-gray-50 p-8">
          <div className="w-full h-full overflow-auto border-4 border-gray-300 bg-gray-200 shadow-inner flex justify-center items-center">
            {activeCanvas ? (
              <Canvas width={activeCanvas.width} height={activeCanvas.height} />
            ) : (
              <div className="text-gray-500">Pas de grille active...</div>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  )
}

export default App