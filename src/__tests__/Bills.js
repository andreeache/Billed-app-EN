import { screen, fireEvent } from "@testing-library/dom";
import { localStorageMock } from "../__mocks__/localStorage.js";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes";
import Router from "../app/Router";
import Bills from "../containers/Bills.js";
import userEvent from "@testing-library/user-event";
import firebase from "../__mocks__/firebase";
import Firestore from "../app/Firestore";

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then the page should contain a loading section", () => {
      // create a general mock for the firestore module
      jest.mock("../app/Firestore");
      Firestore.bills = () => ({ bills, get: jest.fn().mockResolvedValue() });
      // add a local storage mock for the window and set the user property to Employee
      // so the bills.getbills() will be able to extract this field
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      // Route to the Bills (#employee/bills)
      const pathname = ROUTES_PATH["Bills"];
      Object.defineProperty(window, "location", { value: { hash: pathname } });
      document.body.innerHTML = `<div id="root"></div>`;
      Router();

      // expect to find an item that has id "loading-div" and contains the text "Loading..."
      expect(
        screen.getByTestId("loading-div").innerHTML.includes("Loading...")
      ).toBe(true);
    });

    test("Then bills should be ordered from earliest to latest", () => {
      const html = BillsUI({ data: bills });
      document.body.innerHTML = html;
      // retrieve the displayed dates
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      // and now sort the retrieved values
      const chrono = (a, b) => (a > b ? 1 : -1);
      const datesSorted = [...dates].sort(chrono);
      // expect that the retrieved entries are the same as the sorted ones
      expect(dates).toEqual(datesSorted);
    });

    test("Then all the dates in the test set should be displayed", () => {
      let myBills = bills;
      // clean the date from the first bill
      const html = BillsUI({ data: myBills });
      document.body.innerHTML = html;
      // match the dates on the screen using a regular expression
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      // expect that the output has the same length as the input
      expect(dates.length).toBe(myBills.length);
    });

    test("Then if date is invalid it should not crash", () => {
      let myBills = bills;
      // clean the date from the first bill
      delete myBills[0].date;
      const html = BillsUI({ data: myBills });
      document.body.innerHTML = html;
      // match the dates on the screen using a regular expression
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      // expect one less date in the screen matched list
      expect(dates.length).toBe(3);
    });
  });

  describe("When I click the eye icon", () => {
    test("Then a modal should be open", () => {
      // mock the document as above
      jest.mock("../app/Firestore");
      Firestore.bills = () => ({ bills, get: jest.fn().mockResolvedValue() });
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const html = BillsUI({ data: bills });
      document.body.innerHTML = html;
      // wire jquery modal property to a jest stub function and verify if the parameter value is "show"
      jQuery.prototype.modal = jest.fn((p) => {
        expect(p).toBe("show");
      });
      const allBills = new Bills({
        document,
        onNavigate,
        Firestore,
        localStorage: window.localStorage,
      });

      // find the first eye element on the screen
      const eye = screen.getAllByTestId("icon-eye")[0];
      // wire a mocked function (that still calles the regular one) to the click action
      const handleClickIconEye = jest.fn(() => {
        allBills.handleClickIconEye(eye);
      });
      eye.addEventListener("click", handleClickIconEye);

      // and simulate a click on the eye element
      fireEvent.click(eye);

      // expect our mock function to be called
      expect(handleClickIconEye).toHaveBeenCalled();
      // and expect a modal to be displayed
      const modale = document.getElementById("modaleFile");
      expect(modale).toBeTruthy();
    });
  });

  describe("When I click the New fee button", () => {
    test("Then a new fee modal should be opened", () => {
      // mock the document as above
      jest.mock("../app/Firestore");
      Firestore.bills = () => ({ bills, get: jest.fn().mockResolvedValue() });
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const html = BillsUI({ data: bills });
      document.body.innerHTML = html;
      // wire jquery modal property to a jest stub function and verify if the parameter value is "show"
      jQuery.prototype.modal = jest.fn((p) => {
        expect(p).toBe("show");
      });
      onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      // also cover the negative(else) case for the iconeye
      document.querySelectorAll = (filter) => {
        return null;
      };

      const allBills = new Bills({
        document,
        onNavigate,
        Firestore,
        localStorage: window.localStorage,
      });

      // find the button on the screen
      const btn = screen.getByTestId("btn-new-bill");
      // wire a mocked function (that still calles the regular one) to the click action
      const handleClickNewBill = jest.fn(allBills.handleClickNewBill);
      btn.addEventListener("click", handleClickNewBill);

      // and simulate a click on the button
      fireEvent.click(btn);

      // expect our mock function to be called
      expect(handleClickNewBill).toHaveBeenCalled();
      // and expect a modal to be displayed
      const sendAFeeTitle = screen.getByText("Send a fee");
      expect(sendAFeeTitle).toBeTruthy();
    });
  });
});

// GET Bills integration test

describe("Given I am a user connected as Employee", () => {
  describe("When I navigate to Bills UI", () => {
    test("fetches bills from mock API GET", async () => {
      const getSpy = jest.spyOn(firebase, "get");
      const bills = await firebase.get();
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(bills.data.length).toBe(4);
    });
    test("fetches bills from an API and fails with 404 message error", async () => {
      firebase.get.mockImplementationOnce(() =>
        Promise.reject(new Error("Erreur 404"))
      );
      const html = BillsUI({ error: "Erreur 404" });
      document.body.innerHTML = html;
      const message = await screen.getByText(/Erreur 404/);
      expect(message).toBeTruthy();
    });
    test("fetches messages from an API and fails with 500 message error", async () => {
      firebase.get.mockImplementationOnce(() =>
        Promise.reject(new Error("Erreur 500"))
      );
      const html = BillsUI({ error: "Erreur 500" });
      document.body.innerHTML = html;
      const message = await screen.getByText(/Erreur 500/);
      expect(message).toBeTruthy();
    });
  });
});
