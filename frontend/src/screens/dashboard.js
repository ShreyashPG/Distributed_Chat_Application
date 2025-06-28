import React from "react";
import Scroll from "../components/leftscroll"


const DashBoard = () =>{
    return(

<div>

<header className="navbar navbar-dark sticky-top bg-dark flex-md-nowrap p-0 shadow">
  <a className="navbar-brand col-md-3 col-lg-2 me-0 px-3 center" href="#"> <h2 style={{fontFamily:"OpenSans"}}><strong><span style={{color:"blue"}}>B</span>Chat</strong></h2></a>
  {/* <button className="navbar-toggler position-absolute d-md-none collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#sidebarMenu" aria-controls="sidebarMenu" aria-expanded="false" aria-label="Toggle navigation"> */}
    {/* <span className="navbar-toggler-icon"></span> */}
  {/* </button> */}
  <input className="form-control form-control-dark w-100 " type="text" placeholder="Search" aria-label="Search" />
  <ul className="navbar-nav px-3">
    <li className="nav-item text-nowrap">
      <a className="nav-link h6" href="#">Leave</a>
    </li>
  </ul>
</header>


<div className="container-fluid">
  <div className="row">
      <Scroll />

    <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4">
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h3">#general</h1>
        <div className="btn-toolbar mb-2 mb-md-0">
          <div className="btn-group me-2">
            <button type="button" className="btn btn-sm btn-outline-secondary">Share</button>
            <button type="button" className="btn btn-sm btn-outline-secondary">Export</button>
          </div>
          <button type="button" className="btn btn-sm btn-outline-secondary dropdown-toggle">
            <span data-feather="calendar"></span>
            This week
          </button>
        </div>
      </div>

      <canvas className="my-4 w-100"  width="900" height="380">
      </canvas>
        <h1>Hello</h1>
      </main>
  </div>
  </div>

</div>




    )
} ;

export default DashBoard;