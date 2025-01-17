/*
Copyright 2018 - 2024 The Alephium Authors
This file is part of the alephium project.

The library is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

The library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with the library. If not, see <http://www.gnu.org/licenses/>.
*/

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import Select, { SelectOption } from '@/components/Inputs/Select'
import { openModal } from '@/features/modals/modalActions'
import { useAppDispatch, useAppSelector } from '@/hooks/redux'
import { StoredEncryptedWallet } from '@/types/wallet'

const WalletSelect = () => {
  const dispatch = useAppDispatch()
  const { t } = useTranslation()
  const wallets = useAppSelector((s) => s.global.wallets)
  const activeWalletId = useAppSelector((s) => s.activeWallet.id)

  const [walletSelectOptions, setWalletSelectOptions] = useState<SelectOption<string>[]>([])
  const [selectedWalletOption, setSelectedWalletOption] = useState<SelectOption<string>>()

  useEffect(() => {
    const walletOptions = wallets.map((wallet) => ({ value: wallet.id, label: wallet.name }))

    setWalletSelectOptions(walletOptions)
    setSelectedWalletOption(walletOptions.find((wallet) => wallet.value === activeWalletId))
  }, [activeWalletId, wallets])

  const handleWalletSelect = (walletId: StoredEncryptedWallet['id']) => {
    setSelectedWalletOption(walletSelectOptions.find((wallet) => wallet.value === walletId))
    dispatch(openModal({ name: 'WalletUnlockModal', props: { walletId } }))
  }

  return (
    <Select
      controlledValue={selectedWalletOption}
      options={walletSelectOptions}
      onSelect={handleWalletSelect}
      title={t('Select a wallet')}
      id="wallet"
      raised
      skipEqualityCheck
      allowReselectionOnClickWhenSingleOption
    />
  )
}

export default WalletSelect
