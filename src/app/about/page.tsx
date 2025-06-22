'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useWallet } from '../contexts/WalletContext'
import { useRouter } from 'next/navigation'
import { useSpring, animated } from '@react-spring/web'
import { useInView } from 'react-intersection-observer'
import Confetti from 'react-confetti'
import Tilt from 'react-parallax-tilt'

export default function About() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)
  const [showConnectingAnimation, setShowConnectingAnimation] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  const [currentSlogan, setCurrentSlogan] = useState(0)
  const [isHovered, setIsHovered] = useState<string | null>(null)
  const [glitchEffect, setGlitchEffect] = useState(false)
  const [activeSection, setActiveSection] = useState<'overview' | 'posts' | 'obi' | 'campaigns' | 'lucy'>('overview')
  const { connectWallet, address, connecting } = useWallet()
  const router = useRouter()

  // Dynamic slogans for typewriter effect
  const slogans = [
    "Hybrid Web2/Web3 Social Revolution",
    "Decentralized Future of Content",
    "AI-Powered Business Intelligence",
    "Community-Driven Innovation"
  ]

  // Intersection Observer hooks for scroll animations
  const { ref: heroRef, inView: heroInView } = useInView({ threshold: 0.3, triggerOnce: true })
  const { ref: problemRef, inView: problemInView } = useInView({ threshold: 0.2, triggerOnce: true })
  const { ref: featuresRef, inView: featuresInView } = useInView({ threshold: 0.2, triggerOnce: true })
  const { ref: marketRef, inView: marketInView } = useInView({ threshold: 0.2, triggerOnce: true })
  const { ref: revenueRef, inView: revenueInView } = useInView({ threshold: 0.2, triggerOnce: true })

  // Advanced React Spring animations
  const heroSpring = useSpring({
    opacity: heroInView ? 1 : 0,
    transform: heroInView ? 'translateY(0px) scale(1)' : 'translateY(100px) scale(0.8)',
    config: { mass: 1, tension: 200, friction: 50 }
  })

  const glitchSpring = useSpring({
    transform: glitchEffect 
      ? `translate(${Math.random() * 4 - 2}px, ${Math.random() * 4 - 2}px) skew(${Math.random() * 2 - 1}deg)`
      : 'translate(0px, 0px) skew(0deg)',
    filter: glitchEffect ? 'hue-rotate(90deg) saturate(2)' : 'hue-rotate(0deg) saturate(1)',
    config: { duration: 100 }
  })

  const morphingBackground = useSpring({
    background: heroInView 
      ? `radial-gradient(circle at ${mousePosition.x * 0.1}% ${mousePosition.y * 0.1}%, rgba(59, 130, 246, 0.3), rgba(147, 51, 234, 0.2), rgba(236, 72, 153, 0.1))`
      : 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.05), rgba(236, 72, 153, 0.02))',
    config: { duration: 2000 }
  })

  // Dynamic floating animation with physics
  const floatingAnimation = useSpring({
    loop: true,
    from: { 
      transform: 'translateY(0px) rotate(0deg) scale(1)',
      filter: 'brightness(1) contrast(1)'
    },
    to: async (next) => {
      while (true) {
        await next({ 
          transform: 'translateY(-30px) rotate(3deg) scale(1.05)',
          filter: 'brightness(1.2) contrast(1.1)'
        })
        await next({ 
          transform: 'translateY(10px) rotate(-1deg) scale(0.95)',
          filter: 'brightness(0.9) contrast(0.9)'
        })
        await next({ 
          transform: 'translateY(-15px) rotate(2deg) scale(1.02)',
          filter: 'brightness(1.1) contrast(1.05)'
        })
        await next({ 
          transform: 'translateY(0px) rotate(0deg) scale(1)',
          filter: 'brightness(1) contrast(1)'
        })
      }
    },
    config: { duration: 4000, easing: t => Math.sin(t * Math.PI) }
  })
  
  useEffect(() => {
    setMounted(true)
    
    // Window size için
    const updateWindowSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    
    // Slogan değiştirme efekti
    const sloganInterval = setInterval(() => {
      setCurrentSlogan(prev => (prev + 1) % slogans.length)
    }, 3000)
    
    // Random glitch efekti
    const glitchInterval = setInterval(() => {
      if (Math.random() < 0.1) { // %10 şans
        setGlitchEffect(true)
        setTimeout(() => setGlitchEffect(false), 200)
      }
    }, 2000)
    
    updateWindowSize()
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('resize', updateWindowSize)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', updateWindowSize)
      clearInterval(sloganInterval)
      clearInterval(glitchInterval)
    }
  }, [slogans.length])

  // Handle wallet connection with animation
  const handleWalletConnect = async () => {
    await connectWallet()
    if (address) {
      setShowConfetti(true)
      setShowConnectingAnimation(true)
      setTimeout(() => {
        setShowConfetti(false)
      }, 3000)
      setTimeout(() => {
        router.push('/home')
      }, 2000)
    }
  }

  // Watch for address changes to trigger animation
  useEffect(() => {
    if (address && !showConnectingAnimation) {
      setShowConfetti(true)
      setShowConnectingAnimation(true)
      setTimeout(() => {
        setShowConfetti(false)
      }, 3000)
      setTimeout(() => {
        router.push('/home')
      }, 2000)
    }
  }, [address, showConnectingAnimation, router])

  const sections = [
    { id: 'overview', label: 'Overview', icon: '🌟' },
    { id: 'posts', label: 'Forever Posts', icon: '🔗' },
    { id: 'obi', label: 'O.B.I. System', icon: '🧠' },
    { id: 'campaigns', label: 'Campaigns', icon: '💰' },
    { id: 'lucy', label: 'Lucy AI', icon: '🤖' },
  ]

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Confetti Effect */}
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          colors={['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B']}
        />
      )}

      {/* Loading Animation Overlay */}
      {showConnectingAnimation && (
        <motion.div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="text-center">
            <motion.div
              className="w-20 h-20 border-4 border-white/20 border-t-white rounded-full mx-auto mb-6"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <motion.h2
              className="text-2xl sm:text-3xl font-bold text-white mb-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Connecting to Oblivion
            </motion.h2>
            <motion.p
              className="text-white/70 text-lg"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              Welcome to the decentralized future
            </motion.p>
          </div>
        </motion.div>
      )}

      {/* Dynamic Mouse-Following Gradient */}
      <motion.div
        className="fixed inset-0 opacity-30 pointer-events-none z-0"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.1), transparent 50%)`
        }}
      />
      
      {/* Advanced Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Morphing Background */}
        <animated.div 
          style={morphingBackground}
          className="absolute inset-0 opacity-40"
        />

        {/* Dynamic Geometric Shapes */}
        <animated.div
          style={floatingAnimation}
          className="absolute top-1/4 left-1/4 w-32 h-32 border-2 border-blue-400/30 rounded-lg rotate-45"
          onMouseEnter={() => setIsHovered('shape1')}
          onMouseLeave={() => setIsHovered(null)}
        />
        <animated.div
          style={{
            ...floatingAnimation,
            animationDelay: '1s'
          }}
          className="absolute top-3/4 right-1/4 w-24 h-24 border-2 border-purple-400/30 rounded-full"
        />
        <animated.div
          style={{
            ...floatingAnimation,
            animationDelay: '2s'
          }}
          className="absolute top-1/2 right-1/3 w-16 h-16 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-lg rotate-12"
        />

        {/* Interactive Light Beams */}
        {mounted && Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 bg-gradient-to-t from-transparent via-blue-400/20 to-transparent"
            style={{
              height: '100vh',
              left: `${10 + i * 12}%`,
              top: 0,
            }}
            animate={{
              opacity: [0, 0.3, 0],
              scaleX: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          />
        ))}

        {/* Enhanced Floating Orbs with Mouse Interaction */}
        <motion.div
          className="absolute w-96 h-96 rounded-full blur-3xl"
          style={{
            background: 'linear-gradient(45deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15), rgba(236, 72, 153, 0.15))',
            top: '5%',
            right: '5%',
            filter: isHovered ? 'brightness(1.5) saturate(1.5)' : 'brightness(1) saturate(1)',
          }}
          animate={{
            x: [-30 + mousePosition.x * 0.01, 30 + mousePosition.x * 0.01, -30 + mousePosition.x * 0.01],
            y: [-15 + mousePosition.y * 0.01, 15 + mousePosition.y * 0.01, -15 + mousePosition.y * 0.01],
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div
          className="absolute w-80 h-80 rounded-full blur-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(59, 130, 246, 0.15), rgba(168, 85, 247, 0.15))',
            bottom: '10%',
            left: '0%',
          }}
          animate={{
            x: [-20 - mousePosition.x * 0.005, 20 - mousePosition.x * 0.005, -20 - mousePosition.x * 0.005],
            y: [-10 - mousePosition.y * 0.005, 10 - mousePosition.y * 0.005, -10 - mousePosition.y * 0.005],
            scale: [1, 0.8, 1.1, 1],
            rotate: [0, -90, -180, -270, -360],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Enhanced Grid Pattern with Animation */}
        <motion.div 
          className="absolute inset-0 opacity-20"
          animate={{
            backgroundPosition: ['0px 0px', '50px 50px', '0px 0px'],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />

        {/* Holographic Effects */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            background: [
              'linear-gradient(45deg, transparent, rgba(59, 130, 246, 0.1), transparent)',
              'linear-gradient(90deg, transparent, rgba(147, 51, 234, 0.1), transparent)',
              'linear-gradient(135deg, transparent, rgba(236, 72, 153, 0.1), transparent)',
              'linear-gradient(45deg, transparent, rgba(59, 130, 246, 0.1), transparent)',
            ]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Navigation */}
      <motion.nav 
        className="fixed top-0 left-0 right-0 flex items-center justify-between px-4 sm:px-8 py-6 bg-transparent backdrop-blur-md border-b border-white/10 z-50"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <Link href="/">
          <motion.div 
            className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent cursor-pointer"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            OBLIVION
          </motion.div>
        </Link>
        <div className="flex items-center space-x-4 sm:space-x-10">
          {[
            { name: 'Home', href: '/' },
            { name: 'About', href: '/about' }
          ].map((item, index) => (
            <motion.div key={item.name}>
              <Link
                href={item.href}
                className={`text-white/80 hover:text-white transition-all duration-300 relative group text-sm sm:text-base ${
                  item.name === 'About' ? 'text-white' : ''
                }`}
              >
                <motion.span
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.1 * index }}
                  whileHover={{ y: -2 }}
                  className="block"
                >
                  {item.name}
                </motion.span>
                <span className={`absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300 ${
                  item.name === 'About' ? 'w-full' : 'w-0 group-hover:w-full'
                }`}></span>
              </Link>
            </motion.div>
          ))}
          <motion.button 
            className="px-4 sm:px-6 py-2 sm:py-3 border border-white/20 rounded-full text-white/80 hover:bg-white/10 hover:text-white backdrop-blur-sm transition-all duration-300 text-sm sm:text-base"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleWalletConnect}
            disabled={connecting || showConnectingAnimation}
          >
            {connecting || showConnectingAnimation ? 'Connecting...' : 'Log in'}
          </motion.button>
        </div>
      </motion.nav>

      {/* Main Content */}
      <div className="relative z-10 pt-32 pb-16 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Section Navigation */}
          <motion.div
            className="flex flex-wrap justify-center gap-4 mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {sections.map((section) => (
              <motion.button
                key={section.id}
                onClick={() => setActiveSection(section.id as any)}
                className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                  activeSection === section.id
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="mr-2">{section.icon}</span>
                {section.label}
              </motion.button>
            ))}
          </motion.div>

          {/* Overview Section */}
          {activeSection === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Hero Section */}
              <animated.div 
                ref={heroRef}
                style={heroSpring}
                className="text-center mb-16"
              >
                <motion.div
                  className="inline-block bg-gradient-to-r from-blue-500/30 to-purple-500/30 backdrop-blur-lg border border-white/30 rounded-full px-8 py-3 mb-8"
                  whileHover={{ 
                    scale: 1.1, 
                    boxShadow: "0 0 50px rgba(59, 130, 246, 0.5)",
                    borderColor: "rgba(255, 255, 255, 0.8)"
                  }}
                  animate={{
                    borderColor: ["rgba(255, 255, 255, 0.3)", "rgba(59, 130, 246, 0.8)", "rgba(147, 51, 234, 0.8)", "rgba(255, 255, 255, 0.3)"]
                  }}
                  transition={{
                    borderColor: { duration: 4, repeat: Infinity }
                  }}
                >
                  <span className="text-white font-bold text-lg">🚀 Next-Gen Social Platform</span>
                </motion.div>
                
                <animated.h1 
                  style={{
                    ...floatingAnimation,
                    ...glitchSpring
                  }}
                  className="text-6xl sm:text-7xl lg:text-8xl font-black bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent leading-tight mb-8 cursor-pointer"
                  onMouseEnter={() => {
                    setGlitchEffect(true)
                    setTimeout(() => setGlitchEffect(false), 300)
                  }}
                >
                  OBLIVION
                </animated.h1>
                
                {/* Dynamic Typewriter Effect */}
                <motion.div
                  className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white/90 mb-6 h-20 flex items-center justify-center"
                  key={currentSlogan}
                  initial={{ opacity: 0, y: 20, rotateX: 90 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  exit={{ opacity: 0, y: -20, rotateX: -90 }}
                  transition={{ duration: 0.8 }}
                >
                  {slogans[currentSlogan]}
                </motion.div>
                
                <motion.p 
                  className="text-xl sm:text-2xl text-white/80 leading-relaxed max-w-4xl mx-auto mb-8"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                >
                  Empowering creators and businesses with <span className="text-blue-300 font-semibold">zero platform fees</span>, 
                  <span className="text-purple-300 font-semibold"> permanent blockchain storage</span>, and 
                  <span className="text-green-300 font-semibold"> AI-powered intelligence</span>
                </motion.p>
                
                {/* Stats Section */}
                <motion.div
                  className="grid grid-cols-3 gap-4 sm:gap-8 max-w-3xl mx-auto mb-16"
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                >
                  <div className="text-center">
                    <div className="text-3xl sm:text-4xl font-bold text-green-400 mb-1">0%</div>
                    <div className="text-sm sm:text-base text-white/60">Platform Fees</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl sm:text-4xl font-bold text-blue-400 mb-1">∞</div>
                    <div className="text-sm sm:text-base text-white/60">Forever Posts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl sm:text-4xl font-bold text-purple-400 mb-1">100%</div>
                    <div className="text-sm sm:text-base text-white/60">Your Earnings</div>
                  </div>
                </motion.div>
              </animated.div>

              {/* Problem & Solution Section */}
              <motion.div
                ref={problemRef}
                className="bg-gradient-to-r from-red-500/10 to-orange-500/10 backdrop-blur-xl rounded-3xl p-8 sm:p-12 border border-red-500/20 mb-16"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={problemInView ? { scale: 1, opacity: 1 } : { scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
              >
                <h2 className="text-3xl font-bold text-white mb-8 text-center">The Problem We're Solving</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-5xl mb-4">💸</div>
                    <h3 className="text-xl font-semibold text-red-300 mb-2">40% Platform Fees</h3>
                    <p className="text-white/70 text-sm">Udemy, Coursera, and others take massive cuts from creators</p>
                  </div>
                  <div className="text-center">
                    <div className="text-5xl mb-4">🚫</div>
                    <h3 className="text-xl font-semibold text-red-300 mb-2">Content Censorship</h3>
                    <p className="text-white/70 text-sm">Platforms can delete your content without warning</p>
                  </div>
                  <div className="text-center">
                    <div className="text-5xl mb-4">🔒</div>
                    <h3 className="text-xl font-semibold text-red-300 mb-2">No True Ownership</h3>
                    <p className="text-white/70 text-sm">You don't really own your audience or content</p>
                  </div>
                </div>
              </motion.div>

              {/* Core Features with Enhanced Visuals */}
              <motion.div 
                ref={featuresRef}
                className="grid md:grid-cols-3 gap-8 mb-16"
                initial={{ y: 50, opacity: 0 }}
                animate={featuresInView ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
                transition={{ duration: 0.8, delay: 0.9 }}
              >
                <Tilt
                  perspective={1000}
                  glareEnable={true}
                  glareMaxOpacity={0.2}
                  scale={1.05}
                  gyroscope={true}
                >
                  <motion.div
                    className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-xl rounded-3xl p-8 border border-blue-400/30 hover:border-blue-400/50 transition-all duration-300 group"
                    whileHover={{ y: -5 }}
                  >
                    <motion.div 
                      className="text-5xl mb-4"
                      whileHover={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.5 }}
                    >🔗</motion.div>
                    <h3 className="text-2xl font-bold text-white mb-4">Forever Post™ Technology</h3>
                    <p className="text-white/80 leading-relaxed mb-4">
                      Revolutionary dual-storage system: Choose Web2 for speed or Web3 for permanence.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-blue-300">
                        <span className="mr-2">✓</span> Blockchain permanence on Stellar
                      </div>
                      <div className="flex items-center text-sm text-blue-300">
                        <span className="mr-2">✓</span> Censorship-resistant content
                      </div>
                      <div className="flex items-center text-sm text-blue-300">
                        <span className="mr-2">✓</span> Cryptographic ownership proof
                      </div>
                    </div>
                  </motion.div>
                </Tilt>

                <Tilt
                  perspective={1000}
                  glareEnable={true}
                  glareMaxOpacity={0.2}
                  scale={1.05}
                  gyroscope={true}
                >
                  <motion.div
                    className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded-3xl p-8 border border-purple-400/30 hover:border-purple-400/50 transition-all duration-300 group"
                    whileHover={{ y: -5 }}
                  >
                    <motion.div 
                      className="text-5xl mb-4"
                      whileHover={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.5 }}
                    >🧠</motion.div>
                    <h3 className="text-2xl font-bold text-white mb-4">O.B.I. + Lucy AI</h3>
                    <p className="text-white/80 leading-relaxed mb-4">
                      Complete business intelligence suite with AI assistant integration.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-purple-300">
                        <span className="mr-2">✓</span> Venture & repository management
                      </div>
                      <div className="flex items-center text-sm text-purple-300">
                        <span className="mr-2">✓</span> @Lucy AI in comments
                      </div>
                      <div className="flex items-center text-sm text-purple-300">
                        <span className="mr-2">✓</span> Educational path builder
                      </div>
                    </div>
                  </motion.div>
                </Tilt>

                <Tilt
                  perspective={1000}
                  glareEnable={true}
                  glareMaxOpacity={0.2}
                  scale={1.05}
                  gyroscope={true}
                >
                  <motion.div
                    className="bg-gradient-to-br from-green-500/10 to-blue-500/10 backdrop-blur-xl rounded-3xl p-8 border border-green-400/30 hover:border-green-400/50 transition-all duration-300 group"
                    whileHover={{ y: -5 }}
                  >
                    <motion.div 
                      className="text-5xl mb-4"
                      animate={{ y: [-2, 2, -2] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >💰</motion.div>
                    <h3 className="text-2xl font-bold text-white mb-4">Zero-Fee Economy</h3>
                    <p className="text-white/80 leading-relaxed mb-4">
                      Keep 100% of your earnings from courses, campaigns, and content.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-green-300">
                        <span className="mr-2">✓</span> 0% platform commission
                      </div>
                      <div className="flex items-center text-sm text-green-300">
                        <span className="mr-2">✓</span> Instant withdrawals
                      </div>
                      <div className="flex items-center text-sm text-green-300">
                        <span className="mr-2">✓</span> Blockchain transparency
                      </div>
                    </div>
                  </motion.div>
                </Tilt>
              </motion.div>

              {/* Market Opportunity */}
              <motion.div 
                ref={marketRef}
                className="bg-gradient-to-r from-purple-500/5 to-blue-500/5 backdrop-blur-xl rounded-3xl p-8 mb-16 border border-purple-400/20"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={marketInView ? { scale: 1, opacity: 1 } : { scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.8, delay: 1.5 }}
              >
                <h2 className="text-3xl font-bold text-white mb-8 text-center">Market Opportunity</h2>
                <div className="grid md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <motion.div 
                      className="text-4xl font-bold text-blue-400 mb-2"
                      initial={{ scale: 0 }}
                      animate={marketInView ? { scale: 1 } : { scale: 0 }}
                      transition={{ duration: 0.5, delay: 1.6, type: "spring" }}
                    >
                      $4.2T
                    </motion.div>
                    <p className="text-white/70 text-sm">Total Addressable Market</p>
                  </div>
                  <div className="text-center">
                    <motion.div 
                      className="text-4xl font-bold text-green-400 mb-2"
                      initial={{ scale: 0 }}
                      animate={marketInView ? { scale: 1 } : { scale: 0 }}
                      transition={{ duration: 0.5, delay: 1.7, type: "spring" }}
                    >
                      40%
                    </motion.div>
                    <p className="text-white/70 text-sm">Savings vs Competitors</p>
                  </div>
                  <div className="text-center">
                    <motion.div 
                      className="text-4xl font-bold text-purple-400 mb-2"
                      initial={{ scale: 0 }}
                      animate={marketInView ? { scale: 1 } : { scale: 0 }}
                      transition={{ duration: 0.5, delay: 1.8, type: "spring" }}
                    >
                      3-in-1
                    </motion.div>
                    <p className="text-white/70 text-sm">Platform Integration</p>
                  </div>
                  <div className="text-center">
                    <motion.div 
                      className="text-4xl font-bold text-yellow-400 mb-2"
                      initial={{ scale: 0 }}
                      animate={marketInView ? { scale: 1 } : { scale: 0 }}
                      transition={{ duration: 0.5, delay: 1.9, type: "spring" }}
                    >
                      First
                    </motion.div>
                    <p className="text-white/70 text-sm">Hybrid Web2/Web3</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Forever Posts Section */}
          {activeSection === 'posts' && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="text-center mb-12">
                <motion.h1
                  className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  Forever Post™ Technology
                </motion.h1>
                <motion.p
                  className="text-xl text-white/80 max-w-3xl mx-auto"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  The world's first dual-storage social media system. Choose between traditional Web2 posts or permanent Web3 blockchain storage.
                </motion.p>
              </div>

              {/* How It Works */}
              <motion.div
                className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-xl rounded-3xl p-8 sm:p-12 border border-blue-400/20 mb-12"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <h2 className="text-3xl font-bold text-white mb-8 text-center">How Forever Posts Work</h2>
                
                <div className="grid md:grid-cols-4 gap-6 mb-12">
                  <motion.div
                    className="text-center"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                  >
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">1</div>
                    <h3 className="text-lg font-semibold text-white mb-2">Create Post</h3>
                    <p className="text-white/70 text-sm">Write your content and add media</p>
                  </motion.div>
                  
                  <motion.div
                    className="text-center"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                  >
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">2</div>
                    <h3 className="text-lg font-semibold text-white mb-2">Choose Storage</h3>
                    <p className="text-white/70 text-sm">Select Database (Web2) or Oblivion (Web3)</p>
                  </motion.div>
                  
                  <motion.div
                    className="text-center"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                  >
                    <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">3</div>
                    <h3 className="text-lg font-semibold text-white mb-2">Sign & Send</h3>
                    <p className="text-white/70 text-sm">Blockchain posts are cryptographically signed</p>
                  </motion.div>
                  
                  <motion.div
                    className="text-center"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.7 }}
                  >
                    <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">4</div>
                    <h3 className="text-lg font-semibold text-white mb-2">Live Forever</h3>
                    <p className="text-white/70 text-sm">Your content is permanently stored on-chain</p>
                  </motion.div>
                </div>

                {/* Storage Comparison */}
                <div className="grid md:grid-cols-2 gap-8">
                  <motion.div
                    className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10"
                    whileHover={{ scale: 1.02 }}
                  >
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                      <span className="mr-3">📱</span>
                      Database Storage (Web2)
                    </h3>
                    <ul className="space-y-2 text-white/70">
                      <li className="flex items-start">
                        <span className="mr-2 text-green-400">✓</span>
                        <span>Lightning fast posting and loading</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-green-400">✓</span>
                        <span>Edit and delete capabilities</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-green-400">✓</span>
                        <span>No transaction fees</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-green-400">✓</span>
                        <span>Perfect for everyday social posts</span>
                      </li>
                    </ul>
                  </motion.div>

                  <motion.div
                    className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-xl rounded-2xl p-6 border border-purple-400/20"
                    whileHover={{ scale: 1.02 }}
                  >
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                      <span className="mr-3">🔗</span>
                      Oblivion Storage (Web3)
                    </h3>
                    <ul className="space-y-2 text-white/70">
                      <li className="flex items-start">
                        <span className="mr-2 text-purple-400">✓</span>
                        <span>Permanent, immutable storage</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-purple-400">✓</span>
                        <span>Censorship-resistant by design</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-purple-400">✓</span>
                        <span>Cryptographic ownership proof</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-purple-400">✓</span>
                        <span>Perfect for important announcements</span>
                      </li>
                    </ul>
                  </motion.div>
                </div>
              </motion.div>

              {/* Technical Details */}
              <motion.div
                className="bg-gradient-to-r from-purple-500/5 to-blue-500/5 backdrop-blur-xl rounded-3xl p-8 mb-12 border border-purple-400/20"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                <h3 className="text-2xl font-bold text-white mb-6 text-center">Technical Specifications</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl mb-3">🌟</div>
                    <h4 className="text-lg font-semibold text-white mb-2">Stellar Network</h4>
                    <p className="text-white/60 text-sm">Fast, eco-friendly blockchain with 3-5 second confirmations</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-3">💎</div>
                    <h4 className="text-lg font-semibold text-white mb-2">Minimal Cost</h4>
                    <p className="text-white/60 text-sm">~0.00001 XLM per post (less than $0.001)</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-3">🔐</div>
                    <h4 className="text-lg font-semibold text-white mb-2">Smart Contract</h4>
                    <p className="text-white/60 text-sm">Audited Soroban contract ensures security</p>
                  </div>
                </div>
              </motion.div>

              {/* Use Cases */}
              <motion.div
                className="mb-12"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 1.0 }}
              >
                <h3 className="text-2xl font-bold text-white mb-6 text-center">Perfect For</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10 text-center">
                    <div className="text-2xl mb-2">📰</div>
                    <h4 className="font-semibold text-white mb-1">Press Releases</h4>
                    <p className="text-white/60 text-xs">Official announcements that need permanence</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10 text-center">
                    <div className="text-2xl mb-2">🎨</div>
                    <h4 className="font-semibold text-white mb-1">Digital Art</h4>
                    <p className="text-white/60 text-xs">Prove ownership and creation date</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10 text-center">
                    <div className="text-2xl mb-2">📜</div>
                    <h4 className="font-semibold text-white mb-1">Legal Records</h4>
                    <p className="text-white/60 text-xs">Timestamped, immutable documentation</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10 text-center">
                    <div className="text-2xl mb-2">🏆</div>
                    <h4 className="font-semibold text-white mb-1">Achievements</h4>
                    <p className="text-white/60 text-xs">Permanent record of milestones</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* O.B.I. Section */}
          {activeSection === 'obi' && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="text-center mb-12">
                <motion.h1
                  className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  O.B.I. - Oblivion Business Intelligence
                </motion.h1>
                <motion.p
                  className="text-xl text-white/80 max-w-3xl mx-auto"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  A complete ecosystem for building, managing, and monetizing your business ventures with zero platform fees.
                </motion.p>
              </div>

              {/* O.B.I. Structure */}
              <motion.div
                className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded-3xl p-8 sm:p-12 border border-purple-400/20 mb-12"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <h2 className="text-3xl font-bold text-white mb-8 text-center">The O.B.I. Hierarchy</h2>
                
                {/* Visual Hierarchy */}
                <div className="max-w-4xl mx-auto mb-12">
                  <motion.div
                    className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 mb-4"
                    whileHover={{ scale: 1.02 }}
                  >
                    <h3 className="text-2xl font-bold text-white mb-2 flex items-center">
                      <span className="mr-3">🏢</span> Ventures
                    </h3>
                    <p className="text-white/90">Your main business or project containers</p>
                  </motion.div>
                  
                  <div className="ml-8 border-l-4 border-purple-400/50 pl-8">
                    <motion.div
                      className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl p-5 mb-4"
                      whileHover={{ scale: 1.02 }}
                    >
                      <h4 className="text-xl font-semibold text-white mb-2 flex items-center">
                        <span className="mr-3">📁</span> Repositories
                      </h4>
                      <p className="text-white/80">Organize different aspects of your venture</p>
                    </motion.div>
                    
                    <div className="ml-8 border-l-4 border-blue-400/50 pl-8">
                      <motion.div
                        className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-2xl p-4 mb-3"
                        whileHover={{ scale: 1.02 }}
                      >
                        <h5 className="text-lg font-semibold text-white mb-1 flex items-center">
                          <span className="mr-3">🛤️</span> Learning Paths
                        </h5>
                        <p className="text-white/70 text-sm">Sequential educational journeys</p>
                      </motion.div>
                      
                      <div className="ml-8 border-l-4 border-green-400/50 pl-8">
                        <motion.div
                          className="bg-gradient-to-r from-yellow-500/20 to-green-500/20 rounded-2xl p-3"
                          whileHover={{ scale: 1.02 }}
                        >
                          <h6 className="text-base font-semibold text-white mb-1 flex items-center">
                            <span className="mr-2">💎</span> Assets
                          </h6>
                          <p className="text-white/60 text-xs">Individual content pieces, documents, videos</p>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10"
                    whileHover={{ scale: 1.02 }}
                  >
                    <h3 className="text-xl font-semibold text-white mb-4">Venture Features</h3>
                    <ul className="space-y-2 text-white/70">
                      <li className="flex items-start">
                        <span className="mr-2 text-purple-400">•</span>
                        <span>Custom branding with logo and description</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-purple-400">•</span>
                        <span>Public or private visibility settings</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-purple-400">•</span>
                        <span>Analytics dashboard for tracking engagement</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-purple-400">•</span>
                        <span>Direct monetization without platform fees</span>
                      </li>
                    </ul>
                  </motion.div>

                  <motion.div
                    className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10"
                    whileHover={{ scale: 1.02 }}
                  >
                    <h3 className="text-xl font-semibold text-white mb-4">Repository Benefits</h3>
                    <ul className="space-y-2 text-white/70">
                      <li className="flex items-start">
                        <span className="mr-2 text-blue-400">•</span>
                        <span>Organize content by type or category</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-blue-400">•</span>
                        <span>Separate pricing for different repositories</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-blue-400">•</span>
                        <span>Access control per repository</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-blue-400">•</span>
                        <span>Track performance independently</span>
                      </li>
                    </ul>
                  </motion.div>
                </div>
              </motion.div>

              {/* Use Case Examples */}
              <motion.div
                className="mb-12"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                <h3 className="text-2xl font-bold text-white mb-6 text-center">Real-World O.B.I. Applications</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    className="bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-xl rounded-2xl p-6 border border-orange-400/20"
                    whileHover={{ scale: 1.02 }}
                  >
                    <h4 className="text-xl font-semibold text-white mb-3 flex items-center">
                      <span className="mr-3">🧘‍♀️</span> Yoga Instructor Example
                    </h4>
                    <div className="space-y-2 text-white/70 text-sm">
                      <p><strong className="text-white">Venture:</strong> "Mindful Movement Academy"</p>
                      <p><strong className="text-white">Repositories:</strong></p>
                      <ul className="ml-4 space-y-1">
                        <li>• Beginner Flows (Free)</li>
                        <li>• Advanced Techniques ($50)</li>
                        <li>• Teacher Training ($500)</li>
                      </ul>
                      <p><strong className="text-white">Result:</strong> $50,000 revenue, 0% fees paid</p>
                    </div>
                  </motion.div>

                  <motion.div
                    className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-xl rounded-2xl p-6 border border-blue-400/20"
                    whileHover={{ scale: 1.02 }}
                  >
                    <h4 className="text-xl font-semibold text-white mb-3 flex items-center">
                      <span className="mr-3">💻</span> Tech Consultant Example
                    </h4>
                    <div className="space-y-2 text-white/70 text-sm">
                      <p><strong className="text-white">Venture:</strong> "Cloud Architecture Pro"</p>
                      <p><strong className="text-white">Repositories:</strong></p>
                      <ul className="ml-4 space-y-1">
                        <li>• AWS Best Practices</li>
                        <li>• Kubernetes Mastery</li>
                        <li>• Client Templates</li>
                      </ul>
                      <p><strong className="text-white">Result:</strong> Replaced 5 different tools</p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              {/* Learning Paths Feature */}
              <motion.div
                className="bg-gradient-to-r from-green-500/5 to-blue-500/5 backdrop-blur-xl rounded-3xl p-8 border border-green-400/20"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 1.0 }}
              >
                <h3 className="text-2xl font-bold text-white mb-6 text-center">Learning Path Builder</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl mb-3">📚</div>
                    <h4 className="text-lg font-semibold text-white mb-2">Structure Content</h4>
                    <p className="text-white/60 text-sm">Create sequential learning experiences with prerequisites</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-3">🎯</div>
                    <h4 className="text-lg font-semibold text-white mb-2">Track Progress</h4>
                    <p className="text-white/60 text-sm">Students can see their completion status</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-3">🏅</div>
                    <h4 className="text-lg font-semibold text-white mb-2">Issue Certificates</h4>
                    <p className="text-white/60 text-sm">Blockchain-verified completion records</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Campaigns Section */}
          {activeSection === 'campaigns' && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="text-center mb-12">
                <motion.h1
                  className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent mb-4"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  Zero-Fee Campaign System
                </motion.h1>
                <motion.p
                  className="text-xl text-white/80 max-w-3xl mx-auto"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  Revolutionary crowdfunding where creators keep 100% of donations. No platform fees, no waiting periods, instant withdrawals.
                </motion.p>
              </div>

              {/* Campaign Process */}
              <motion.div
                className="bg-gradient-to-r from-green-500/10 to-blue-500/10 backdrop-blur-xl rounded-3xl p-8 sm:p-12 border border-green-400/20 mb-12"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <h2 className="text-3xl font-bold text-white mb-8 text-center">How Campaigns Work</h2>
                
                <div className="grid md:grid-cols-3 gap-8 mb-12">
                  <motion.div
                    className="text-center"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">📝</div>
                    <h3 className="text-xl font-semibold text-white mb-2">Create Campaign</h3>
                    <p className="text-white/70">Set your goal, deadline, and describe your project</p>
                  </motion.div>
                  
                  <motion.div
                    className="text-center"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">💳</div>
                    <h3 className="text-xl font-semibold text-white mb-2">Receive Donations</h3>
                    <p className="text-white/70">Supporters donate directly via blockchain</p>
                  </motion.div>
                  
                  <motion.div
                    className="text-center"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🎉</div>
                    <h3 className="text-xl font-semibold text-white mb-2">Instant Access</h3>
                    <p className="text-white/70">Withdraw funds immediately, no waiting</p>
                  </motion.div>
                </div>

                {/* Fee Comparison */}
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 mb-8">
                  <h3 className="text-xl font-semibold text-white mb-4 text-center">Platform Fee Comparison</h3>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-400 mb-2">5-8%</div>
                      <p className="text-white/60 text-sm">Kickstarter</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-400 mb-2">3%+</div>
                      <p className="text-white/60 text-sm">GoFundMe</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-400 mb-2">5%</div>
                      <p className="text-white/60 text-sm">Indiegogo</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-400 mb-2">3%</div>
                      <p className="text-white/60 text-sm font-semibold">Oblivion</p>
                    </div>
                  </div>
                </div>

                {/* Campaign Features */}
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    className="bg-gradient-to-br from-green-500/10 to-blue-500/10 backdrop-blur-xl rounded-2xl p-6 border border-green-400/20"
                    whileHover={{ scale: 1.02 }}
                  >
                    <h4 className="text-xl font-semibold text-white mb-4">For Creators</h4>
                    <ul className="space-y-2 text-white/70">
                      <li className="flex items-start">
                        <span className="mr-2 text-green-400">✓</span>
                        <span>Keep 100% of all donations</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-green-400">✓</span>
                        <span>Withdraw funds anytime</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-green-400">✓</span>
                        <span>No minimum funding requirements</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-green-400">✓</span>
                        <span>Campaign analytics dashboard</span>
                      </li>
                    </ul>
                  </motion.div>

                  <motion.div
                    className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-xl rounded-2xl p-6 border border-blue-400/20"
                    whileHover={{ scale: 1.02 }}
                  >
                    <h4 className="text-xl font-semibold text-white mb-4">For Supporters</h4>
                    <ul className="space-y-2 text-white/70">
                      <li className="flex items-start">
                        <span className="mr-2 text-blue-400">✓</span>
                        <span>100% goes to the creator</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-blue-400">✓</span>
                        <span>Blockchain-verified transactions</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-blue-400">✓</span>
                        <span>Real-time funding progress</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2 text-blue-400">✓</span>
                        <span>Direct creator connection</span>
                      </li>
                    </ul>
                  </motion.div>
                </div>
              </motion.div>

              {/* Success Stories */}
              <motion.div
                className="mb-12"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                <h3 className="text-2xl font-bold text-white mb-6 text-center">Campaign Success Stories</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <motion.div
                    className="bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-xl rounded-2xl p-6 border border-orange-400/20"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="text-4xl mb-3">🎮</div>
                    <h4 className="text-lg font-semibold text-white mb-2">Indie Game Studio</h4>
                    <p className="text-white/70 text-sm mb-3">Raised $150,000 for their new game</p>
                    <p className="text-green-400 font-semibold">Saved: $12,000 in fees</p>
                  </motion.div>

                  <motion.div
                    className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-xl rounded-2xl p-6 border border-blue-400/20"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="text-4xl mb-3">🏥</div>
                    <h4 className="text-lg font-semibold text-white mb-2">Medical Research</h4>
                    <p className="text-white/70 text-sm mb-3">Funded COVID-19 research project</p>
                    <p className="text-green-400 font-semibold">Saved: $8,000 in fees</p>
                  </motion.div>

                  <motion.div
                    className="bg-gradient-to-br from-green-500/10 to-blue-500/10 backdrop-blur-xl rounded-2xl p-6 border border-green-400/20"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="text-4xl mb-3">🌱</div>
                    <h4 className="text-lg font-semibold text-white mb-2">Eco Startup</h4>
                    <p className="text-white/70 text-sm mb-3">Launched sustainable product line</p>
                    <p className="text-green-400 font-semibold">Saved: $5,000 in fees</p>
                  </motion.div>
                </div>
              </motion.div>

              {/* Campaign Types */}
              <motion.div
                className="bg-gradient-to-r from-purple-500/5 to-blue-500/5 backdrop-blur-xl rounded-3xl p-8 border border-purple-400/20"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 1.0 }}
              >
                <h3 className="text-2xl font-bold text-white mb-6 text-center">Campaign Types</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-3xl mb-2">🚀</div>
                    <h4 className="font-semibold text-white mb-1">Product Launch</h4>
                    <p className="text-white/60 text-xs">Fund your next big idea</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-2">❤️</div>
                    <h4 className="font-semibold text-white mb-1">Charity</h4>
                    <p className="text-white/60 text-xs">Support causes that matter</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-2">🎨</div>
                    <h4 className="font-semibold text-white mb-1">Creative Projects</h4>
                    <p className="text-white/60 text-xs">Fund art, music, films</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-2">💡</div>
                    <h4 className="font-semibold text-white mb-1">Innovation</h4>
                    <p className="text-white/60 text-xs">Support breakthrough ideas</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Lucy AI Section */}
          {activeSection === 'lucy' && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="text-center mb-12">
                <motion.h1
                  className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent mb-4"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  Lucy AI Assistant
                </motion.h1>
                <motion.p
                  className="text-xl text-white/80 max-w-3xl mx-auto"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  Your intelligent companion integrated directly into Oblivion. Just mention @Lucy in any comment for instant AI assistance.
                </motion.p>
              </div>

              {/* How Lucy Works */}
              <motion.div
                className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 backdrop-blur-xl rounded-3xl p-8 sm:p-12 border border-yellow-400/20 mb-12"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <h2 className="text-3xl font-bold text-white mb-8 text-center">How Lucy Works</h2>
                
                {/* Demo Conversation */}
                <div className="max-w-3xl mx-auto mb-12">
                  <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">U</div>
                        <div>
                          <p className="font-semibold text-white mb-1">User Post</p>
                          <p className="text-white/80">"Just launched my new yoga course on Oblivion! Excited to share my 10 years of experience."</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3 ml-12">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm">C</div>
                        <div>
                          <p className="font-semibold text-white mb-1">Commenter</p>
                          <p className="text-white/80">"@Lucy what makes this course special?"</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3 ml-12">
                        <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white text-sm">🤖</div>
                        <div>
                          <p className="font-semibold text-white mb-1">Lucy AI</p>
                          <p className="text-white/80">"This yoga course leverages 10 years of expertise and Oblivion's zero-fee platform means creators keep 100% of earnings - perfect for dedicated instructors!"</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="grid md:grid-cols-3 gap-6">
                  <motion.div
                    className="text-center"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="text-4xl mb-3">💬</div>
                    <h3 className="text-lg font-semibold text-white mb-2">Context Aware</h3>
                    <p className="text-white/70 text-sm">Understands the post and conversation flow</p>
                  </motion.div>
                  
                  <motion.div
                    className="text-center"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="text-4xl mb-3">⚡</div>
                    <h3 className="text-lg font-semibold text-white mb-2">Instant Response</h3>
                    <p className="text-white/70 text-sm">Replies within 1-3 seconds</p>
                  </motion.div>
                  
                  <motion.div
                    className="text-center"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="text-4xl mb-3">🧠</div>
                    <h3 className="text-lg font-semibold text-white mb-2">QWEN Powered</h3>
                    <p className="text-white/70 text-sm">Advanced AI model for intelligent conversations</p>
                  </motion.div>
                </div>
              </motion.div>

              {/* Use Cases */}
              <motion.div
                className="mb-12"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                <h3 className="text-2xl font-bold text-white mb-6 text-center">What Lucy Can Help With</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div
                    className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded-2xl p-6 border border-purple-400/20"
                    whileHover={{ scale: 1.02 }}
                  >
                    <h4 className="text-xl font-semibold text-white mb-3">Content Understanding</h4>
                    <ul className="space-y-2 text-white/70 text-sm">
                      <li>• Summarize long posts</li>
                      <li>• Explain complex topics</li>
                      <li>• Provide additional context</li>
                      <li>• Answer questions about content</li>
                    </ul>
                  </motion.div>

                  <motion.div
                    className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-xl rounded-2xl p-6 border border-blue-400/20"
                    whileHover={{ scale: 1.02 }}
                  >
                    <h4 className="text-xl font-semibold text-white mb-3">Engagement Support</h4>
                    <ul className="space-y-2 text-white/70 text-sm">
                      <li>• Generate discussion ideas</li>
                      <li>• Suggest related topics</li>
                      <li>• Provide helpful insights</li>
                      <li>• Foster community interaction</li>
                    </ul>
                  </motion.div>
                </div>
              </motion.div>

              {/* Technical Details */}
              <motion.div
                className="bg-gradient-to-r from-purple-500/5 to-blue-500/5 backdrop-blur-xl rounded-3xl p-8 border border-purple-400/20"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 1.0 }}
              >
                <h3 className="text-2xl font-bold text-white mb-6 text-center">Lucy's Capabilities</h3>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl mb-2">🌍</div>
                    <h4 className="font-semibold text-white mb-1">Multi-lingual</h4>
                    <p className="text-white/60 text-xs">Responds in multiple languages</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-2">📚</div>
                    <h4 className="font-semibold text-white mb-1">Knowledge Base</h4>
                    <p className="text-white/60 text-xs">Vast general knowledge</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-2">🎯</div>
                    <h4 className="font-semibold text-white mb-1">Concise</h4>
                    <p className="text-white/60 text-xs">200 character limit for clarity</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-2">🤝</div>
                    <h4 className="font-semibold text-white mb-1">Friendly</h4>
                    <p className="text-white/60 text-xs">Natural, helpful tone</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Final Call to Action */}
          <motion.div 
            className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-xl rounded-3xl p-8 sm:p-12 border border-purple-400/30 text-center mt-16"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            whileHover={{ scale: 1.01 }}
          >
            <motion.div
              className="inline-block px-4 py-1 bg-green-500/20 rounded-full border border-green-400/30 mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 1.3, type: "spring" }}
            >
              <span className="text-green-400 font-semibold text-sm">🏆 Hackathon Ready</span>
            </motion.div>
            
            <motion.h2 
              className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent mb-6"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.4 }}
            >
              Join the Revolution
            </motion.h2>
            
            <motion.p 
              className="text-lg sm:text-xl text-white/80 leading-relaxed max-w-4xl mx-auto mb-8"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.5 }}
            >
              Be part of the <span className="text-blue-300 font-semibold">first platform</span> that truly puts creators first. 
              <span className="text-purple-300 font-semibold"> Zero fees</span>, <span className="text-green-300 font-semibold">infinite possibilities</span>, 
              and <span className="text-yellow-300 font-semibold">complete ownership</span> of your digital future.
            </motion.p>
            
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.6 }}
            >
              <Link href="/">
                <motion.button 
                  className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white font-semibold px-8 py-4 rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-purple-500/25"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Experience Oblivion Now
                </motion.button>
              </Link>
              
              <motion.div
                className="text-white/60 text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.8 }}
              >
                <span className="font-semibold text-white">Live Demo Available</span> • No Sign-up Required
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
