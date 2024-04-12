import { Query } from "@namada/shared";
import { Account } from "@namada/types";
import BigNumber from "bignumber.js";
import { atom } from "jotai";
import { chainAtom } from "./chain";

type Unique = {
  uuid: string;
};

export type Validator = Unique & {
  alias: string;
  address: string;
  homepageUrl: string;
  votingPowerInNAM?: BigNumber;
  votingPowerPercentage?: number;
  commission: BigNumber;
  imageUrl?: string;
};

export type MyValidators = Unique & {
  stakingStatus: string;
  stakedAmount?: BigNumber;
  unbondedAmount?: BigNumber;
  withdrawableAmount?: BigNumber;
  validator: Validator;
};

const toValidator = (address: string): Validator => ({
  uuid: address,
  alias: "<Validator Name>",
  address,
  homepageUrl: "http://namada.net",
  votingPowerInNAM: BigNumber("70000000"),
  votingPowerPercentage: 0.06,
  commission: new BigNumber(0), // TODO: implement commission
  imageUrl: "https://placekitten.com/200/200",
});

export const validatorsAtom = atom<Validator[]>([]);
export const fetchAllValidatorsAtom = atom(
  (get) => get(validatorsAtom),
  async (get, set) => {
    const { rpc } = get(chainAtom);
    const query = new Query(rpc);
    const queryResult =
      (await query.query_all_validator_addresses()) as string[];
    set(validatorsAtom, queryResult.map(toValidator));
  }
);

export const myValidatorsAtom = atom<MyValidators[]>([]);

//
// fetches staking data and appends the validators to it
// this needs the validators, so they are being passed in
// vs. getting them from the state
//
// TODO this or fetchMyStakingPositions is likely redundant based on
// real data model stored in the chain, adjust when implementing the real data
export const fetchMyValidatorsAtom = atom(
  null,
  async (get, set, accounts: readonly Account[] = []) => {
    const { rpc } = get(chainAtom);
    const addresses = accounts.map((account) => account.address);
    const query = new Query(rpc);
    const myValidatorsRes = await query.query_my_validators(addresses);
    const myValidators = myValidatorsRes.reduce(toMyValidators, []);
    set(myValidatorsAtom, myValidators);
  }
);

const toMyValidators = (
  acc: MyValidators[],
  [_, validator, stake, unbonded, withdrawable]: [
    string,
    string,
    string,
    string,
    string,
  ]
): MyValidators[] => {
  const index = acc.findIndex((myValidator) => myValidator.uuid === validator);
  const v = acc[index];
  const sliceFn =
    index == -1 ?
      (arr: MyValidators[]) => arr
    : (arr: MyValidators[], idx: number) => [
        ...arr.slice(0, idx),
        ...arr.slice(idx + 1),
      ];

  const stakedAmount = new BigNumber(stake).plus(
    new BigNumber(v?.stakedAmount || 0)
  );

  const unbondedAmount = new BigNumber(unbonded).plus(
    new BigNumber(v?.unbondedAmount || 0)
  );

  const withdrawableAmount = new BigNumber(withdrawable).plus(
    new BigNumber(v?.withdrawableAmount || 0)
  );

  return [
    ...sliceFn(acc, index),
    {
      uuid: validator,
      stakingStatus: "Bonded",
      stakedAmount,
      unbondedAmount,
      withdrawableAmount,
      validator: toValidator(validator),
    },
  ];
};
