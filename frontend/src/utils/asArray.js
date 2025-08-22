import { asArray } from '../utils/asArray'; // ajuste o caminho

{asArray(companyData.services).map(...)}
{asArray(companyData.staff).map(...)}
{asArray(availableSlots).map(...)}
{asArray(appointment?.items).map(...)}
{asArray(appointment?.payments).map(...)}
{asArray(appointment?.service?.addons).map(...)}
{asArray(appointment?.client?.tags).map(...)}
