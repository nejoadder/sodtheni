/*alert('Alert window: Hello world!!');*/
document.getElementById('btn').addEventListener('click', () => {
    returnAlert();
  });

  function bifogaTabelen() {
    let result = prompt("Skriv i nånting: ");
    alert("Print out result: " + result);
    alert(typeof(result));

    let number = 1234;

    alert("Casta nummret till string typ: " + typeof number);

    let strNumber = String(number);
    alert(typeof(strNumber));

    alert("BIFOGA TABELEN!!!");

    const tabel1 = document.getElementById("tableSpecial");
    const tabel2 = document.getElementById("nagonTabel");

    tabel2.appendChild(tabel1);

    alert("Ska fetcha funktionen som ger tillbaka data. Kallar en api!!!");
    fetchPost();

  }

  function returnAlert() { 
    
    /*[1, 2, 3, 4].forEach(alert(ble()));*/
    /*alert('Test')*/

    /*[1, 2, 3, 4].forEach(alert("Kort FOR LOOP!!!"));*/

    const array = ["hehe", "blah", "ble"];

    array.forEach((value, index) => {
      alert('Value: ' + value + ' ,Index: ' + index);
    });

    /*ble();*/

    alert('Kör på FOR LOOP med nycklar!!!');

    const keyArray = { Someone: "Någon Person: ", Namn: "Anna" };

    for (const key in keyArray) {
      /*alert('Name: ' + name + ', ');*/
      alert(key + ', ' + keyArray[key]);

    }
    
    /*alert("Something NEW!!!");*/
    
    /*for (let i = 0; i < 5; i++) {
      alert("something");
    }*/
  }

  
  function ble() {
    let tekstAlert = "test någonting";
    alert(tekstAlert);
  }


  async function fetchPost() {
    try {
      //let response = await fetch ("https://jsonplaceholder.typicode.com/posts");
      let response = await fetch("https://jsonplaceholder.typicode.com/posts/1");
      let data = await response.json();

      const doc = document.getElementById("pSista");
      const htmlTabel = `<tabel><tr><td>Title: </td><td>${data.title}</td></tr></br><tr><td>Blah</td>Blah<td></td></tr>
                         </br><tr><td>Hehe</td><td>Hehe</td></tr></br><tr><td>Body: </td><td>${data.body}</td></br></tr></tabel>`;
      doc.innerHTML = htmlTabel;

      //const res = await fetch("https://jsonplaceholder.typicode.com/posts/1");  
      //const ble = await res.json();
      //alert(ble.title);
    }
    catch (err) {
      alert(err);

    }

  }


  async function hamtaDataFranBackend() {
    const resultEl = document.getElementById("result");
    resultEl.textContent = "Laddar...";

    try {
      const response = await fetch("http://localhost:3001/api/post");

      if (!response.ok) {
      throw new Error("HTTP-fel: " + response.status);
      }

      const data = await response.json();
      resultEl.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
      resultEl.textContent = "Fel vid anrop: " + error.message;
    }
  }

  document.getElementById("fetchBtn").addEventListener("click", hamtaDataFranBackend);

  async function hamtaDataFranBackend() {
    const resultEl = document.getElementById("result");
    resultEl.textContent = "Laddar...";

    try {
      const response = await fetch("http://localhost:3001/api/post");

      if (!response.ok) {
        throw new Error("HTTP-fel: " + response.status);
      }

      const data = await response.json();
      resultEl.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
      resultEl.textContent = "Fel vid anrop: " + error.message;
    }
  }

  document.getElementById("fetchBtn").addEventListener("click", hamtaDataFranBackend);