"use client"
import React, { useEffect, useRef, useState } from 'react'
import Navbar from './_components/Navbar/page'
import Banner from './_components/Banner/page'
import Results from './_components/Results/page'
import Results2 from './_components/Result2/page'
import Results3 from './_components/Results3/page'
import { useRouter } from 'next/navigation'
import LoadingOverlay from '../_components/LoadingOverlay'

export default function Dashboard() {
  const [showResults, setShowResults] = useState(false);
  const [showQuiz2Results, setShowQuiz2Results] = useState(false);
  const [showQuiz3Results,setShowQuiz3Results]=useState(false);
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(true)

  useEffect(() => {
    const authCheck = ()=>{
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem("token");
        if(!token){
          router.push('/login');
          setIsAuthenticated(false)
        }else{
          setIsAuthenticated(true)
        }
      }
    };
    authCheck()
  }, [router]);

  

  const toggleResults = () => {
    setShowResults(prevState => !prevState); 
  };

  const toggleQuiz2Results = () => {
    setShowQuiz2Results(prevState => !prevState);
  };

  const toggleQuiz3Results= () => {
    setShowQuiz3Results(prevState=>!prevState)
  };

  if(!isAuthenticated){
    return (
        <div className='h-screen flex items-center justify-center text-white'>
            <div>
                <div className='font-semibold'>
                     <LoadingOverlay loadText={"Loading..."}/>
                </div>
            </div>
        </div>
    )
  }

  

  return (
    <div>
      {/* <Navbar/> */}
      <Banner onToggleResults={toggleResults} showResults={showResults} onToggleQuiz2Results={toggleQuiz2Results} showQuiz2Results={showQuiz2Results}  onToggleQuiz3Results={toggleQuiz3Results} showQuiz3Results={showQuiz3Results}/>
      <br />
      <br />
      {showResults && <Results />} 
      {showQuiz2Results && <Results2/>}
      {showQuiz3Results && <Results3/>}
    </div>
  )
}
