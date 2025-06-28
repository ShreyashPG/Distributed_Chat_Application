

import React from 'react';
import './leftscroll.css';

const Scroll = ({ rooms = [], users = [] }) => {
  // Map over rooms if it's an array; otherwise, render nothing
  const elts = Array.isArray(rooms) && rooms.length > 0
    ? rooms.map((r) => (
        <li className="nav-item" key={r}>
          <div className="nav-link">
            <h6>{r}</h6>
          </div>
        </li>
      ))
    : null;

  // Map over users if it's an array; otherwise, render nothing
  const elts2 = Array.isArray(users) && users.length > 0
    ? users.map((r) => (
        <li className="nav-item" key={r}>
          <div className="nav-link">
            <h6>{r}</h6>
          </div>
        </li>
      ))
    : null;

  return (
    <div>
      <nav id="sidebarMenu" className="col-md-3 col-lg-2 d-md-block bg-light sidebar collapse">
        <div className="position-sticky pt-3">
          <ul className="nav flex-column">
            <li className="nav-item">
              <a className="nav-link active" aria-current="page" href="#">
                <span data-feather="home"></span>
                <h4>Public Available Rooms</h4>
              </a>
            </li>
            {elts}
          </ul>
        </div>
        <div className="position-sticky pt-3">
          <ul className="nav flex-column">
            <li className="nav-item">
              <a className="nav-link active" aria-current="page" href="#">
                <span data-feather="home"></span>
                <h4>Available Users</h4>
              </a>
            </li>
            {elts2}
          </ul>
        </div>
      </nav>
    </div>
  );
};

export default Scroll;