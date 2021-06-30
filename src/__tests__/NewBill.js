import {
  screen,
  fireEvent,
  waitForElementToBeRemoved,
} from "@testing-library/dom";
import { localStorageMock } from "../__mocks__/localStorage.js";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import BillsUI from "../views/BillsUI.js";
import firestore from "../app/Firestore";
import firebase from "../__mocks__/firebase";
import { ROUTES, ROUTES_PATH } from "../constants/routes";

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    test("Then the input image is propagated into handleChangeFile", () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const html = NewBillUI();
      document.body.innerHTML = html;

      // add mock for the calls in handleChangeFile
      firestore.storage.ref = (e) => {
        expect(e).toBe("justificatifs/");

        // we have to return an object that has a put method
        let rv = new Object();
        rv.put = (file) => {
          expect(file.name).toBe("myimage.jpg");
          // return an empty promise just to be able to call then on it
          return new Promise((a) => {});
        };
        return rv;
      };

      // create the bill instance
      const newBill = new NewBill({
        document,
        onNavigate,
        firestore: firestore,
        localStorage: localStorageMock,
      });

      // overwrite the change event with the jest wrapper
      const handleChangeFile = jest.fn(newBill.handleChangeFile);
      const inputFile = screen.getByTestId("file");
      inputFile.addEventListener("change", handleChangeFile);

      // set the input file to our file
      fireEvent.change(inputFile, {
        target: {
          files: [
            new File(["myimage.jpg"], "myimage.jpg", { type: "image/jpeg" }),
          ],
        },
      });
      expect(handleChangeFile).toHaveBeenCalled();
    });

    test("Then when I click on submit, it creates a new pending bill", () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const html = NewBillUI();
      document.body.innerHTML = html;

      // add mock for the calls in handleChangeFile
      firestore.storage.ref = (e) => {
        expect(e).toBe("justificatifs/");

        // we have to return an object that has a put method
        let rv = new Object();
        rv.put = (file) => {
          expect(file.name).toBe("myimage.jpg");
          // return an empty promise just to be able to call then on it
          return new Promise((a) => {});
        };
        return rv;
      };

      // create the bill instance
      const newBill = new NewBill({
        document,
        onNavigate,
        firestore: firestore,
        localStorage: localStorageMock,
      });


      const inputFile = screen.getByTestId("file");


      // set the input file to our file
      fireEvent.change(inputFile, {
        target: {
          files: [
            new File(["myimage.jpg"], "myimage.jpg", { type: "image/jpeg" }),
          ],
        },
      });

      firestore.store.collection = (e) => {
        expect(e).toBe("bills");

        let rv = new Object();
        rv.add = (e) => {
          expect(e.pct).toBe(20);
          return new Promise((a) => {});
        };
        return rv;
      };

      const handleSubmit = jest.fn(newBill.handleSubmit);
      const formNewBill = screen.getByTestId("form-new-bill");
      formNewBill.addEventListener("submit", handleSubmit);

      fireEvent.submit(formNewBill);
      expect(handleSubmit).toHaveBeenCalled();
    });
  });
});

//Post NewBill integration test

describe("Given I am a user connected as Employee", () => {
  describe("When I create a new bill", () => {
    test("Add bill to mock API POST", async () => {
      const getSpyPost = jest.spyOn(firebase, "post");
      const newBill = {
        id: "qcCK3SzECmaZAGRrHjaC",
        status: "refused",
        pct: 20,
        amount: 200,
        email: "a@a",
        name: "test2",
        vat: "40",
        fileName: "preview-facture-free-201801-pdf-1.jpg",
        date: "2004-02-02",
        commentAdmin: "pas la bonne facture",
        commentary: "test2",
        type: "Restaurants et bars",
        fileUrl:
          "https://firebasestorage.googleapis.com/v0/b/billable-677b6.a…f-1.jpg?alt=media&token=4df6ed2c-12c8-42a2-b013-346c1346f732",
      };
      const bills = await firebase.post(newBill);
      expect(getSpyPost).toHaveBeenCalledTimes(1);
      expect(bills.data.length).toBe(5);
      expect(bills.data[4].date).toBe("2004-02-02");
    });
    test("Add bill to API and fails with 404 message error", async () => {
      firebase.post.mockImplementationOnce(() =>
        Promise.reject(new Error("Erreur 404"))
      );
      const html = BillsUI({ error: "Erreur 404" });
      document.body.innerHTML = html;
      const message = await screen.getByText(/Erreur 404/);
      expect(message).toBeTruthy();
    });
    test("Add bill to API and fails with 500 message error", async () => {
      firebase.post.mockImplementationOnce(() =>
        Promise.reject(new Error("Erreur 404"))
      );
      const html = BillsUI({ error: "Erreur 500" });
      document.body.innerHTML = html;
      const message = await screen.getByText(/Erreur 500/);
      expect(message).toBeTruthy();
    });
  });
});

