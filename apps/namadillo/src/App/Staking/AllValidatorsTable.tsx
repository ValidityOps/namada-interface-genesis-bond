import { ActionButton, TableRow } from "@namada/components";
import { formatPercentage } from "@namada/utils";
import { AtomErrorBoundary } from "App/Common/AtomErrorBoundary";
import { NamCurrency } from "App/Common/NamCurrency";
import { Search } from "App/Common/Search";
import { TableRowLoading } from "App/Common/TableRowLoading";
import { WalletAddress } from "App/Common/WalletAddress";
import { namadaExtensionConnectedAtom } from "atoms/settings";
import { atomsAreLoading, atomsAreNotInitialized } from "atoms/utils";
import { allValidatorsAtom } from "atoms/validators";
import BigNumber from "bignumber.js";
import { useValidatorFilter } from "hooks/useValidatorFilter";
import { useValidatorTableSorting } from "hooks/useValidatorTableSorting";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Validator } from "types";
import { ValidatorAlias } from "./ValidatorAlias";
import { ValidatorThumb } from "./ValidatorThumb";
import { ValidatorsTable } from "./ValidatorsTable";
import StakingRoutes from "./routes";

type AllValidatorsProps = {
  resultsPerPage?: number;
  initialPage?: number;
};

export const AllValidatorsTable = ({
  resultsPerPage = 100,
  initialPage = 0,
}: AllValidatorsProps): JSX.Element => {
  const validators = useAtomValue(allValidatorsAtom);
  const isConnected = useAtomValue(namadaExtensionConnectedAtom);
  const navigate = useNavigate();
  const [filter, setFilter] = useState("");

  const filteredValidators = useValidatorFilter({
    validators: validators.isSuccess ? validators.data : [],
    myValidatorsAddresses: [],
    searchTerm: filter,
    onlyMyValidators: false,
  });

  const { sortedValidators: sortedAndFilteredValidators, sortableColumns } =
    useValidatorTableSorting({
      validators: filteredValidators,
      stakedAmountByAddress: {},
    });

  const headers = [
    "",
    "Validator",
    "Address",
    {
      children: "Voting Power",
      className: "text-right",
      ...sortableColumns["votingPowerInNAM"],
    },
    {
      children: "Commission",
      className: "text-right",
      ...sortableColumns["commission"],
    },
  ];

  const renderRow = (validator: Validator): TableRow => ({
    className: "[&_td:first-child]:pr-0",
    cells: [
      // Thumbnail:
      <ValidatorThumb
        key={`validator-image-${validator.address}`}
        imageUrl={validator.imageUrl}
        alt={validator.alias ?? validator.address}
      />,
      // Alias:
      <ValidatorAlias
        key={`validator-alias-${validator.address}`}
        alias={validator.alias}
      />,
      // Address:
      <WalletAddress
        key={`address-${validator.address}`}
        address={validator.address}
      />,
      // Voting Power:
      <div
        className="flex flex-col text-right"
        key={`validator-voting-power-${validator.address}`}
      >
        {validator.votingPowerInNAM && (
          <NamCurrency
            amount={validator.votingPowerInNAM}
            forceBalanceDisplay
          />
        )}
        <span className="text-neutral-600 text-sm">
          {formatPercentage(BigNumber(validator.votingPowerPercentage || 0))}
        </span>
      </div>,
      // Commission:
      <div key={`commission-${validator.address}`} className="text-right">
        {formatPercentage(BigNumber(validator.commission))}
      </div>,
    ],
  });

  if (atomsAreLoading(validators) || atomsAreNotInitialized(validators)) {
    return <TableRowLoading count={2} />;
  }

  return (
    <AtomErrorBoundary
      result={validators}
      niceError="Unable to load validators list"
      containerProps={{ className: "pb-16" }}
    >
      <div className="min-h-[450px] flex flex-col">
        <div className="grid grid-cols-[40%_max-content] justify-between mb-5">
          <Search
            onChange={(value: string) => setFilter(value)}
            placeholder="Search Validator"
          />
          {isConnected && (
            <ActionButton
              size="sm"
              backgroundColor="cyan"
              onClick={() => navigate(StakingRoutes.incrementBonding().url)}
            >
              Stake
            </ActionButton>
          )}
        </div>
        {validators.data && (
          <div className="flex flex-col h-[490px] overflow-hidden">
            <ValidatorsTable
              id="all-validators"
              validatorList={sortedAndFilteredValidators}
              headers={headers}
              initialPage={initialPage}
              resultsPerPage={resultsPerPage}
              renderRow={renderRow}
            />
          </div>
        )}
      </div>
    </AtomErrorBoundary>
  );
};
