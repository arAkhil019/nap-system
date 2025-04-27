import logo from './logo.svg';
import App from './components/App';

import './App.css';

function AppMain() {
  // Import your components from src folder
  // Example: import ComponentName from './components/ComponentName';
  
  return (
    <div className="App">
      <header className="App-header">
        {/* You can replace this with your components */}
        {/* Example: <ComponentName /> */}
        <h1>My React Application</h1>
        <p>Start adding your components from the src folder</p>
      </header>
      <main>
        {/* Add your main content components here */}
        {/* Example:
          <YourComponent1 />
          <YourComponent2 />
        */
       <App />
        }
      </main>
    </div>
  );
}

export default AppMain;
