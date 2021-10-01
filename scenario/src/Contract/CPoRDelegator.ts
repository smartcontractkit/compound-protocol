import { Contract } from '../Contract';
import { Callable, Sendable } from '../Invokation';
import { CTokenMethods } from './CToken';
import { encodedNumber } from '../Encoding';

interface CPoRDelegatorMethods extends CTokenMethods {
  implementation(): Callable<string>;
  _setImplementation(
    implementation_: string,
    allowResign: boolean,
    becomImplementationData: string
  ): Sendable<void>;
}

interface CPoRDelegatorScenarioMethods extends CPoRDelegatorMethods {
  setTotalBorrows(amount: encodedNumber): Sendable<void>;
  setTotalReserves(amount: encodedNumber): Sendable<void>;
}

export interface CPoRDelegator extends Contract {
  methods: CPoRDelegatorMethods;
  name: string;
}

export interface CPoRDelegatorScenario extends Contract {
  methods: CPoRDelegatorMethods;
  name: string;
}
