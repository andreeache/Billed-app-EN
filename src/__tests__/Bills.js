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
      const pathname = ROUTES_PATH["Bills"];
      Object.defineProperty(window, "location", { value: { hash: pathname } });
      document.body.innerHTML = `<div id="root"></div>`;
      Router();

      expect(
        screen.getByTestId("loading-div").innerHTML.includes("Loading...")
      ).toBe(true);
    });

    test("Then bills should be ordered from earliest to latest", () => {
      const html = BillsUI({ data: bills });
      document.body.innerHTML = html;
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      const chrono = (a, b) => (a > b ? 1 : -1);
      const datesSorted = [...dates].sort(chrono);
      expect(dates).toEqual(datesSorted);
    });

    test("Then if date is invalid it should return -1", () => {
      let myBills = bills;
      let b = myBills[0];
      delete b.date;
      myBills[0] = b;
      const html = BillsUI({ data: myBills });
      document.body.innerHTML = html;
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      const chrono = (a, b) => (a > b ? 1 : -1);
      const datesSorted = [...dates].sort(chrono);

      expect(myBills[0].data).toBe(undefined);
      expect(dates).toEqual(datesSorted);
    });
  });

  describe("When I click the eye icon", () => {
    test("Then a modal should be open", () => {
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

      const eye = screen.getAllByTestId("icon-eye")[0];
      const handleClickIconEye = jest.fn(() => {
        allBills.handleClickIconEye(eye);
      });
      eye.addEventListener("click", handleClickIconEye);

      fireEvent.click(eye);

      expect(handleClickIconEye).toHaveBeenCalled();
      const modale = document.getElementById("modaleFile");
      expect(modale).toBeTruthy();
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