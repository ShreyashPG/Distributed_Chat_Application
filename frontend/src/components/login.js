import React from 'react'
import "./login.css"

import google from "./google.png"

const Login = () =>{
    return (
        <div className='login'>
            <h2  style={{paddingBottom:"2.5rem"}}>Sign In</h2>
            <div className='row rt'>
                <div className='neumorphic' style={{cursor:'pointer'}}>
                    <img src={google} height="30" width="30"/>
                </div>
            </div>
        </div>
    )
}

export default Login;